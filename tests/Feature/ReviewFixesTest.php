<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Invitation;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Coverage for the 2026-10-20 review list (numbers refer to that list).
 */
class ReviewFixesTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private User $coord;
    private User $volUser;
    private Volunteer $volunteer;
    private User $super;
    private Event $event;
    private Shift $shift;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org   = Organization::create(['name' => 'Red Cross Ethiopia', 'email' => 'rc@example.org', 'status' => 'active', 'verification_status' => 'verified']);
        $this->admin = User::create(['org_id' => $this->org->id, 'full_name' => 'Org Admin', 'email' => 'admin@rc.org', 'password' => Hash::make('password'), 'role' => 'OrgAdmin']);
        $this->coord = User::create(['org_id' => $this->org->id, 'full_name' => 'Coord Abebe', 'email' => 'coord@rc.org', 'password' => Hash::make('password'), 'role' => 'Coordinator']);
        $this->super = User::create(['org_id' => null, 'full_name' => 'Platform Admin', 'email' => 'super@vms.com', 'password' => Hash::make('password'), 'role' => 'SuperAdmin']);

        // Independent volunteer: not a member of any organization.
        $this->volUser   = User::create(['org_id' => null, 'full_name' => 'Hana Tesfaye', 'email' => 'hana@example.com', 'password' => Hash::make('password'), 'role' => 'Volunteer']);
        $this->volunteer = Volunteer::create(['user_id' => $this->volUser->id, 'skills' => ['first_aid'], 'total_hours' => 0, 'impact_score' => 0]);

        $this->event = Event::create([
            'org_id' => $this->org->id, 'title' => 'Bole Blood Drive', 'location' => 'Bole', 'latitude' => 9.010000, 'longitude' => 38.740000,
            'start_date' => now()->subDay()->toDateString(), 'end_date' => now()->addDays(5)->toDateString(), 'status' => 'ongoing', 'geofence_radius' => 100,
        ]);
        $this->shift = Shift::create([
            'event_id' => $this->event->id, 'start_time' => now()->subMinutes(5), 'end_time' => now()->addHours(3),
            'capacity' => 4, 'qr_secret' => str_repeat('a', 64), 'required_skills' => [],
        ]);
    }

    private function confirm(?Volunteer $v = null, ?Shift $s = null): ShiftAssignment
    {
        return ShiftAssignment::create(['shift_id' => ($s ?? $this->shift)->id, 'volunteer_id' => ($v ?? $this->volunteer)->id, 'status' => 'confirmed']);
    }

    private function qr(): string
    {
        return app(AttendanceService::class)->qrToken($this->shift->fresh())['token'];
    }

    private function checkIn(array $extra = [])
    {
        return $this->actingAs($this->volUser, 'sanctum')->postJson('/api/volunteer/check-in', $extra + [
            'shift_id' => $this->shift->id, 'qr_code_signature' => $this->qr(),
            'latitude' => 9.010001, 'longitude' => 38.740001, 'accuracy' => 12, 'client_timestamp' => now()->toIso8601String(),
        ]);
    }

    // #23 #24 — rotating QR, geofence, accuracy
    public function test_rotating_qr_token_is_accepted_and_forged_or_stale_tokens_are_refused(): void
    {
        $this->confirm();
        $window = intdiv(time(), 30);
        $stale  = "VT1.{$this->shift->id}." . ($window - 5) . '.deadbeefdeadbeefdead';

        $this->checkIn(['qr_code_signature' => $stale])->assertStatus(422)->assertJsonPath('code', 'qr_invalid');
        $this->checkIn(['accuracy' => 900])->assertStatus(422)->assertJsonPath('code', 'gps_inaccurate');
        $this->checkIn(['latitude' => 8.98])->assertStatus(422)->assertJsonPath('code', 'outside_geofence');
        $this->checkIn()->assertStatus(201)->assertJsonPath('data.hours_status', 'pending');
    }

    // #5 #9 — second check-in is refused with the live attendance; schedule shows state
    public function test_checked_in_state_is_visible_and_double_check_in_is_refused(): void
    {
        $this->confirm();
        $this->checkIn()->assertStatus(201);
        $this->checkIn()->assertStatus(409)->assertJsonPath('code', 'already_checked_in');

        $schedule = $this->actingAs($this->volUser, 'sanctum')->getJson('/api/volunteer/schedule')->assertOk();
        $this->assertNotNull($schedule->json('data.0.attendance.check_in_time'));
        $this->assertNull($schedule->json('data.0.attendance.check_out_time'));
        $this->assertEquals(1, Attendance::count());
    }

    // #7 #6c — early check-out needs a reason, alerts staff, can be undone
    public function test_early_checkout_requires_reason_notifies_staff_and_can_be_resumed(): void
    {
        $this->confirm();
        $this->checkIn();

        $this->actingAs($this->volUser, 'sanctum')->postJson('/api/volunteer/check-out', ['shift_id' => $this->shift->id])
            ->assertStatus(422)->assertJsonPath('code', 'reason_required');

        $out = $this->actingAs($this->volUser, 'sanctum')->postJson('/api/volunteer/check-out', ['shift_id' => $this->shift->id, 'reason' => 'Feeling unwell'])->assertOk();
        $this->assertTrue($out->json('data.can_resume'));
        $this->assertGreaterThan(0, $this->coord->notifications()->where('data->type', 'volunteer_left_early')->count());

        $this->actingAs($this->volUser, 'sanctum')->postJson('/api/volunteer/check-out/undo', ['shift_id' => $this->shift->id])
            ->assertOk()->assertJsonPath('data.check_out_time', null);
    }

    // #6a — forgotten check-out is closed at the scheduled end
    public function test_sweep_auto_checks_out_at_scheduled_end(): void
    {
        $past = Shift::create(['event_id' => $this->event->id, 'start_time' => now()->subHours(6), 'end_time' => now()->subHours(2), 'capacity' => 2]);
        $att  = Attendance::create(['shift_id' => $past->id, 'volunteer_id' => $this->volunteer->id, 'check_in_time' => now()->subHours(6), 'hours_status' => 'pending']);

        app(AttendanceService::class)->sweep();

        $att->refresh();
        $this->assertEquals('auto', $att->check_out_method);
        $this->assertEquals($past->end_time->toDateTimeString(), $att->check_out_time->toDateTimeString());
        $this->assertContains('auto_checked_out', $att->flags);
    }

    // #14 #8 #16 — manual check-in by ID, manual check-out, verify / adjust with delta crediting
    public function test_manual_check_in_out_and_hours_verification_credit_once(): void
    {
        $a = $this->confirm();
        $in = $this->actingAs($this->coord, 'sanctum')->postJson("/api/coordinator/applications/{$a->id}/force-checkin", ['id_verified' => true, 'time' => now()->subHours(2)->toDateTimeString()])
            ->assertStatus(201)->assertJsonPath('data.check_in_method', 'manual');
        $id = $in->json('data.id');

        $this->actingAs($this->coord, 'sanctum')->postJson("/api/coordinator/attendance/{$id}/check-out", ['reason' => 'No phone'])->assertOk();
        $this->actingAs($this->coord, 'sanctum')->getJson('/api/coordinator/attendance/pending')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->coord, 'sanctum')->patchJson("/api/coordinator/attendance/{$id}/verify", ['status' => 'adjusted', 'verified_hours' => 1.5])->assertOk();
        $this->assertEquals(1.5, (float) $this->volunteer->fresh()->total_hours);

        $this->actingAs($this->coord, 'sanctum')->patchJson("/api/coordinator/attendance/{$id}/verify", ['status' => 'adjusted', 'verified_hours' => 2])->assertOk();
        $this->assertEquals(2.0, (float) $this->volunteer->fresh()->total_hours, 'Re-adjusting credits only the difference');
    }

    // #19 #20 — edit & delete shift with volunteers on it
    public function test_shift_edit_and_delete_respect_volunteers(): void
    {
        $future = Shift::create(['event_id' => $this->event->id, 'start_time' => now()->addDay()->setTime(9, 0), 'end_time' => now()->addDay()->setTime(12, 0), 'capacity' => 3]);
        $this->confirm(null, $future);
        $other = Volunteer::create(['user_id' => User::create(['full_name' => 'Two', 'email' => 'two@x.com', 'password' => 'x', 'role' => 'Volunteer'])->id]);
        $this->confirm($other, $future);

        $this->actingAs($this->coord, 'sanctum')->patchJson("/api/coordinator/shifts/{$future->id}", ['capacity' => 1])->assertStatus(422);
        $this->actingAs($this->coord, 'sanctum')->patchJson("/api/coordinator/shifts/{$future->id}", ['capacity' => 5, 'title' => 'Morning'])->assertOk()->assertJsonPath('data.title', 'Morning');

        $this->actingAs($this->coord, 'sanctum')->deleteJson("/api/coordinator/shifts/{$future->id}")->assertOk()->assertJsonPath('data.volunteers_notified', 2);
        $this->assertEquals(2, ShiftAssignment::where('shift_id', $future->id)->where('status', 'cancelled')->count());
        $this->assertEquals(1, $this->volUser->notifications()->where('data->type', 'shift_cancelled')->count());

        // A shift with attendance cannot be deleted.
        $this->confirm();
        $this->checkIn();
        $this->actingAs($this->coord, 'sanctum')->deleteJson("/api/coordinator/shifts/{$this->shift->id}")->assertStatus(422);
    }

    // #21 — independent volunteers who applied appear in the coordinator directory with names
    public function test_volunteer_directory_includes_applicants_from_outside_the_org(): void
    {
        ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $this->volunteer->id, 'status' => 'confirmed']);

        $res = $this->actingAs($this->coord, 'sanctum')->getJson('/api/coordinator/volunteers')->assertOk();
        $this->assertEquals('Hana Tesfaye', $res->json('data.0.user.full_name'));
        $this->assertEquals('applicant', $res->json('data.0.relationship'));

        $apps = $this->actingAs($this->coord, 'sanctum')->getJson("/api/coordinator/events/{$this->event->id}/applications")->assertOk();
        $this->assertEquals('Hana Tesfaye', $apps->json('data.0.volunteer.user.full_name'));
    }

    // #30 #31 #32 — inactive status saves; suspended/inactive orgs disappear and staff are blocked
    public function test_inactive_and_suspended_organizations_are_hidden_and_blocked(): void
    {
        $this->actingAs($this->volUser, 'sanctum')->getJson('/api/volunteer/events')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->super, 'sanctum')->patchJson("/api/superadmin/organizations/{$this->org->id}/status", ['status' => 'inactive'])
            ->assertOk()->assertJsonPath('data.status', 'inactive');

        $this->actingAs($this->volUser, 'sanctum')->getJson('/api/volunteer/events')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->volUser, 'sanctum')->postJson("/api/volunteer/apply/{$this->shift->id}")->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $token = $this->coord->createToken('t')->plainTextToken;
        $this->withHeader('Authorization', "Bearer $token")->getJson('/api/coordinator/events')->assertStatus(403)->assertJsonPath('code', 'organization_inactive');
    }

    // #34 #35 #36 #25 — invitations: no typed password, one-time link, forced change, resend
    public function test_coordinator_invitation_flow(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/coordinators', [
            'first_name' => 'Selam', 'last_name' => 'Bekele', 'email' => 'selam@rc.org', 'phone' => '+251911000111',
        ])->assertStatus(201);
        $token = basename($res->json('invitation.invite_url'));
        $user  = User::where('email', 'selam@rc.org')->first();
        $this->assertTrue($user->must_change_password);
        $this->assertEquals('Selam Bekele', $user->full_name);

        $this->getJson("/api/invitations/{$token}")->assertOk()->assertJsonPath('data.usable', true);
        $this->postJson("/api/invitations/{$token}/accept", ['password' => 'newpass123', 'password_confirmation' => 'newpass123'])->assertOk();
        $this->postJson("/api/invitations/{$token}/accept", ['password' => 'again12345', 'password_confirmation' => 'again12345'])->assertStatus(410);

        $user->refresh();
        $this->assertFalse($user->must_change_password);
        $this->assertNotNull($user->email_verified_at);
        $this->postJson('/api/login', ['email' => 'selam@rc.org', 'password' => 'newpass123'])->assertOk()->assertJsonPath('must_change_password', false);
    }

    // #11 — change password
    public function test_change_password(): void
    {
        $this->actingAs($this->volUser, 'sanctum')->patchJson('/api/account/password', ['current_password' => 'wrong', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])
            ->assertStatus(422)->assertJsonValidationErrors('current_password');
        $this->actingAs($this->volUser, 'sanctum')->patchJson('/api/account/password', ['current_password' => 'password', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])->assertOk();
        $this->assertTrue(Hash::check('newpass123', $this->volUser->fresh()->password));
    }

    // #10 — profile photo stored in the database, served publicly
    public function test_profile_photo_upload(): void
    {
        $res = $this->actingAs($this->volUser, 'sanctum')->post('/api/account/photo', ['photo' => UploadedFile::fake()->image('me.png', 200, 200)], ['Accept' => 'application/json'])->assertOk();
        $url = $res->json('data.profile_photo_url');
        $this->assertStringContainsString('/api/files/', $url);
        $this->get(parse_url($url, PHP_URL_PATH))->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    // #37 #38 #39 — public sign-up: Free plan, pending verification, hidden until verified
    public function test_public_signup_creates_free_unverified_org(): void
    {
        $this->post('/api/public/organizations/signup', [
            'org_name' => 'Mekedonia', 'org_email' => 'info@mekedonia.org', 'org_country' => 'ET', 'org_city' => 'Addis Ababa', 'org_phone' => '+251911222333',
            'admin_first_name' => 'Binyam', 'admin_last_name' => 'Belete', 'admin_email' => 'binyam@mekedonia.org', 'accept_terms' => '1',
            'documents' => [['file' => UploadedFile::fake()->create('license.pdf', 120, 'application/pdf'), 'type' => 'registration_certificate']],
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $org = Organization::where('email', 'info@mekedonia.org')->first();
        $this->assertEquals('free', $org->subscription_plan);
        $this->assertEquals('pending', $org->verification_status);
        $this->assertEquals(1, $org->documents()->count());
        $this->assertFalse($org->isPublic());
        $this->assertEquals(1, $this->super->notifications()->where('data->type', 'organization_signup')->count());
    }

    // #44 — plan limits are enforced server-side
    public function test_free_plan_limits_coordinators_and_branding(): void
    {
        User::create(['org_id' => $this->org->id, 'full_name' => 'Second Coord', 'email' => 'c2@rc.org', 'password' => 'x', 'role' => 'Coordinator']);
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/coordinators', ['first_name' => 'A', 'last_name' => 'B', 'email' => 'c3@rc.org'])
            ->assertStatus(402)->assertJsonPath('code', 'plan_limit');
        $this->actingAs($this->admin, 'sanctum')->patchJson('/api/admin/organization', ['primary_color' => '#3341B8'])
            ->assertStatus(402)->assertJsonPath('required_plan', 'pro');

        $this->org->update(['subscription_plan' => 'pro', 'plan_expires_at' => now()->addMonth()]);
        $this->actingAs($this->admin, 'sanctum')->patchJson('/api/admin/organization', ['primary_color' => '#3341B8'])->assertOk();
    }

    // #42 — payment auto-verified by Verify.ET, rejected when paid to someone else, cheki fallback
    public function test_payment_verification_drivers(): void
    {
        config(['plans.verifier.verifyet.api_key' => 'k', 'plans.verifier.receiver_name' => 'VolunTrack PLC', 'plans.verifier.receiver_account_suffix' => null]);
        Http::fake([
            'verify.et/*' => Http::sequence()
                ->push(['success' => true, 'data' => [['verified' => true, 'amount' => 1500, 'receiverName' => 'VOLUNTRACK PLC', 'timestamp' => now()->toIso8601String()]], 'verification' => ['verified' => true]])
                ->push(['success' => true, 'data' => [['verified' => true, 'amount' => 1500, 'receiverName' => 'Someone Else', 'timestamp' => now()->toIso8601String()]], 'verification' => ['verified' => true]])
                ->push([], 503),
            'cheki.et/*' => Http::response(['success' => true, 'verified' => true, 'amount' => 1500, 'receiverName' => 'VolunTrack PLC', 'date' => now()->toDateString()]),
        ]);

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/billing/payments', ['plan' => 'pro', 'months' => 1, 'method' => 'cbe', 'transaction_ref' => 'FT26AAA111'])
            ->assertStatus(201)->assertJsonPath('data.status', 'verified');
        $this->assertEquals('pro', $this->org->fresh()->effectivePlan());

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/billing/payments', ['plan' => 'pro', 'months' => 1, 'method' => 'cbe', 'transaction_ref' => 'FT26BBB222'])
            ->assertStatus(201)->assertJsonPath('data.status', 'rejected');

        // Verify.ET down → cheki answers.
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/billing/payments', ['plan' => 'pro', 'months' => 1, 'method' => 'telebirr', 'transaction_ref' => 'CHQ1ABC2DE'])
            ->assertStatus(201)->assertJsonPath('data.status', 'verified')->assertJsonPath('data.verification_source', 'cheki');

        // Reused reference is refused.
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/billing/payments', ['plan' => 'pro', 'months' => 1, 'method' => 'cbe', 'transaction_ref' => 'FT26AAA111'])->assertStatus(422);
        $this->assertEquals(3, Payment::count());
    }

    // #41 — audit export is human readable
    public function test_audit_csv_is_readable(): void
    {
        $this->actingAs($this->super, 'sanctum')->patchJson("/api/superadmin/organizations/{$this->org->id}/status", ['status' => 'suspended'])->assertOk();
        $csv = $this->actingAs($this->super, 'sanctum')->get('/api/superadmin/audit-logs?format=csv')->assertOk()->getContent();

        $this->assertStringContainsString('Changed organization status / plan', $csv);
        $this->assertStringContainsString('Platform Admin', $csv);
        $this->assertStringContainsString('Red Cross Ethiopia', $csv);
        $this->assertStringContainsString('Status: active → suspended', $csv);
        $this->assertStringNotContainsString('App\\Models', $csv);
    }

    // #12 #13 — announcements and urgent alerts reach volunteers outside the org
    public function test_announcements_and_urgent_alerts_reach_engaged_and_independent_volunteers(): void
    {
        ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $this->volunteer->id, 'status' => 'pending']);

        $this->actingAs($this->coord, 'sanctum')->postJson('/api/coordinator/announcements', ['title' => 'Bring water', 'message' => 'Hot day tomorrow.', 'target_audience' => 'volunteers'])->assertStatus(201);
        $list = $this->actingAs($this->volUser, 'sanctum')->getJson('/api/announcements')->assertOk();
        $this->assertEquals('Bring water', $list->json('data.0.title'));
        $this->assertEquals(1, $list->json('unread_count'));
        $this->assertEquals(1, $this->volUser->notifications()->where('data->type', 'announcement')->count());

        $future = Shift::create(['event_id' => $this->event->id, 'start_time' => now()->addDays(2), 'end_time' => now()->addDays(2)->addHours(3), 'capacity' => 3, 'required_skills' => ['first_aid']]);
        $this->actingAs($this->coord, 'sanctum')->getJson("/api/coordinator/shifts/{$future->id}/broadcast-preview")->assertOk()->assertJsonPath('data.matching_volunteers', 1);
        $this->actingAs($this->coord, 'sanctum')->postJson("/api/coordinator/shifts/{$future->id}/broadcast")->assertStatus(202)->assertJsonPath('data.notified', 1);
        $this->assertEquals(1, $this->volUser->notifications()->where('data->type', 'shift_broadcast')->count());

        $this->actingAs($this->volUser, 'sanctum')->getJson('/api/notifications')->assertOk()->assertJsonPath('unread_count', 2);
    }

    // #17 #2 — documents upload & review; #46 report organization; #45 messaging
    public function test_documents_reports_and_messages(): void
    {
        ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $this->volunteer->id, 'status' => 'pending']);
        $doc = $this->actingAs($this->volUser, 'sanctum')->post('/api/volunteer/documents', [
            'file' => UploadedFile::fake()->create('first-aid.pdf', 50, 'application/pdf'), 'document_type' => 'certification', 'title' => 'ERCS First Aid',
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $this->actingAs($this->coord, 'sanctum')->getJson('/api/coordinator/documents?status=pending')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->coord, 'sanctum')->patchJson('/api/coordinator/documents/' . $doc->json('data.id') . '/verify', ['status' => 'verified'])->assertOk();

        $this->actingAs($this->volUser, 'sanctum')->postJson("/api/volunteer/organizations/{$this->org->id}/report", [
            'category' => 'payment_requested', 'details' => 'The coordinator asked volunteers to pay a registration fee.',
        ])->assertStatus(201);
        $this->assertEquals(1, $this->super->notifications()->where('data->type', 'organization_reported')->count());

        $thread = $this->actingAs($this->super, 'sanctum')->postJson('/api/superadmin/threads', ['subject' => 'Documents', 'body' => 'Please upload your license.', 'org_ids' => [$this->org->id]])->assertStatus(201);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/threads')->assertOk()->assertJsonPath('unread_count', 1);
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/threads/' . $thread->json('data.id') . '/messages', ['body' => 'Uploaded, thanks.'])->assertStatus(201);
        $this->actingAs($this->super, 'sanctum')->getJson('/api/superadmin/threads/' . $thread->json('data.id'))->assertOk()->assertJsonCount(2, 'data.messages');
    }

    // #1 — organization page for volunteers
    public function test_volunteer_sees_organization_on_events_and_org_page(): void
    {
        $this->actingAs($this->volUser, 'sanctum')->getJson('/api/volunteer/events')->assertOk()->assertJsonPath('data.0.organization.name', 'Red Cross Ethiopia');
        $this->actingAs($this->volUser, 'sanctum')->getJson("/api/volunteer/events?org_id={$this->org->id}&when=past")->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->volUser, 'sanctum')->getJson("/api/volunteer/organizations/{$this->org->id}")->assertOk()->assertJsonPath('data.stats.active_events', 1);
    }

    // #28 — platform charts have data
    public function test_platform_timeseries_and_health(): void
    {
        $this->actingAs($this->super, 'sanctum')->getJson('/api/superadmin/metrics/timeseries')->assertOk()->assertJsonCount(12, 'data');
        $this->actingAs($this->super, 'sanctum')->getJson('/api/superadmin/health')->assertOk()->assertJsonStructure(['data' => ['ok', 'checks' => ['database', 'mail', 'payment_verification']]]);
        $this->actingAs($this->super, 'sanctum')->getJson('/api/superadmin/users?role=Volunteer')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->super, 'sanctum')->getJson('/api/superadmin/admins')->assertOk()->assertJsonCount(1, 'data');
    }
}
