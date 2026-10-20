<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WaitlistAndAlertsTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $coord;
    private Event $event;
    private Shift $shift;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org   = Organization::create(['name' => 'Mekedonia', 'email' => 'm@example.org', 'status' => 'active', 'verification_status' => 'verified']);
        $this->coord = User::create(['org_id' => $this->org->id, 'full_name' => 'Coord Sara', 'email' => 'coord@m.org', 'password' => Hash::make('password'), 'role' => 'Coordinator']);
        $this->event = Event::create([
            'org_id' => $this->org->id, 'title' => 'Meal Day', 'location' => 'Piassa', 'latitude' => 9.03, 'longitude' => 38.75,
            'start_date' => now()->toDateString(), 'end_date' => now()->addDays(5)->toDateString(), 'status' => 'upcoming',
        ]);
        $this->shift = Shift::create([
            'event_id' => $this->event->id, 'start_time' => now()->addDays(2), 'end_time' => now()->addDays(2)->addHours(3),
            'capacity' => 1, 'qr_secret' => str_repeat('b', 64), 'required_skills' => [],
        ]);
    }

    private function volunteer(string $name): User
    {
        $u = User::create(['org_id' => null, 'full_name' => $name, 'email' => strtolower(str_replace(' ', '.', $name)) . '@ex.com', 'password' => Hash::make('password'), 'role' => 'Volunteer']);
        Volunteer::create(['user_id' => $u->id, 'skills' => [], 'total_hours' => 0, 'impact_score' => 0]);
        return $u->fresh();
    }

    public function test_full_shift_puts_volunteers_on_waitlist_and_a_freed_place_promotes_the_first(): void
    {
        $a = $this->volunteer('Abel One');
        $b = $this->volunteer('Bethel Two');
        $c = $this->volunteer('Chala Three');
        $confirmed = ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $a->volunteer->id, 'status' => 'confirmed']);

        $this->actingAs($b, 'sanctum')->postJson("/api/volunteer/apply/{$this->shift->id}")
            ->assertStatus(201)->assertJsonPath('data.status', 'waitlisted')->assertJsonPath('data.waitlist_position', 1);
        $this->travel(1)->seconds();
        $this->actingAs($c, 'sanctum')->postJson("/api/volunteer/apply/{$this->shift->id}")
            ->assertStatus(201)->assertJsonPath('data.waitlist_position', 2);

        // Abel withdraws → Bethel (first in line) gets the place, Chala stays waiting at #1.
        $this->actingAs($a, 'sanctum')->deleteJson("/api/volunteer/apply/{$confirmed->id}")->assertOk();

        $this->assertSame('confirmed', ShiftAssignment::where('volunteer_id', $b->volunteer->id)->value('status'));
        $this->assertSame('waitlisted', ShiftAssignment::where('volunteer_id', $c->volunteer->id)->value('status'));
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $b->id]);
    }

    public function test_capacity_increase_fills_from_waitlist(): void
    {
        $a = $this->volunteer('Abel One');
        $b = $this->volunteer('Bethel Two');
        ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $a->volunteer->id, 'status' => 'confirmed']);
        ShiftAssignment::create(['shift_id' => $this->shift->id, 'volunteer_id' => $b->volunteer->id, 'status' => 'waitlisted', 'waitlisted_at' => now()]);

        $this->actingAs($this->coord, 'sanctum')->patchJson("/api/coordinator/shifts/{$this->shift->id}", ['capacity' => 2])->assertOk();

        $this->assertSame('confirmed', ShiftAssignment::where('volunteer_id', $b->volunteer->id)->value('status'));
    }

    public function test_telegram_link_and_webhook_store_the_chat_and_alerts_are_sent(): void
    {
        config(['services.telegram.bot_token' => 'TKN', 'services.telegram.bot_username' => 'VolunTrackBot', 'services.telegram.webhook_secret' => 'hook-secret']);
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);
        $u = $this->volunteer('Hana Tesfaye');

        $url = $this->actingAs($u, 'sanctum')->postJson('/api/account/telegram')->assertOk()->json('data.url');
        $this->assertStringStartsWith('https://t.me/VolunTrackBot?start=', $url);
        $token = substr($url, strpos($url, '=') + 1);

        $this->postJson('/api/telegram/webhook/wrong', [])->assertStatus(403);
        $this->postJson('/api/telegram/webhook/hook-secret', ['message' => ['chat' => ['id' => 5551234], 'text' => "/start {$token}"]])->assertOk();
        $this->assertSame('5551234', $u->fresh()->telegram_chat_id);

        // Any app notification now also goes to Telegram.
        app(\App\Services\Notifier::class)->send($u->fresh(), new \App\Notifications\AppNotification('shift_changed', 'Shift time changed', 'New time 10:00'));
        Http::assertSent(fn ($r) => str_contains($r->url(), 'sendMessage') && $r['chat_id'] === '5551234' && str_contains($r['text'], 'Shift time changed'));
    }

    public function test_sms_opt_in_needs_a_phone_number(): void
    {
        $u = $this->volunteer('Kebede Ali');
        $this->actingAs($u, 'sanctum')->patchJson('/api/account', ['sms_opt_in' => true])->assertStatus(422);
        $this->actingAs($u, 'sanctum')->patchJson('/api/account', ['sms_opt_in' => true, 'phone' => '+251911223344', 'locale' => 'am'])->assertOk();
        $this->assertTrue($u->fresh()->sms_opt_in);
        $this->assertSame('am', $u->fresh()->locale);
    }

    public function test_public_organization_page_needs_no_login_and_hides_contact_details(): void
    {
        $this->getJson("/api/public/organizations/{$this->org->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Mekedonia')
            ->assertJsonPath('data.upcoming_events.0.title', 'Meal Day')
            ->assertJsonMissingPath('data.email');

        $this->org->update(['status' => 'suspended']);
        \Illuminate\Support\Facades\Cache::flush();
        $this->getJson("/api/public/organizations/{$this->org->id}")->assertNotFound();
    }
}
