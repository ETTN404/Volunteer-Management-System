<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use App\Notifications\CertificateIssuedNotification;
use App\Notifications\OrganizationSuspendedNotification;
use App\Notifications\ShiftApprovedNotification;
use App\Notifications\ShiftBroadcastNotification;
use App\Services\CertificateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

use Tests\TestCase;

class NotificationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_shift_approved_notification_is_dispatched(): void
    {
        Notification::fake();

        $org = Organization::create(['name' => 'Org A', 'email' => 'orga@example.com']);
        $coord = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Coord',
            'email'     => 'coord@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Coordinator',
        ]);
        $volUser = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Volunteer',
            'email'     => 'vol@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Volunteer',
        ]);
        $vol = Volunteer::create(['user_id' => $volUser->id]);

        $event = Event::create([
            'org_id'     => $org->id,
            'title'      => 'Event 1',
            'location'   => 'Location 1',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
        ]);
        $shift = Shift::create([
            'event_id'   => $event->id,
            'start_time' => now()->addHour()->toDateTimeString(),
            'end_time'   => now()->addHours(4)->toDateTimeString(),
            'capacity'   => 5,
        ]);

        $assignment = ShiftAssignment::create([
            'shift_id'     => $shift->id,
            'volunteer_id' => $vol->id,
            'status'       => 'pending',
        ]);

        $response = $this->actingAs($coord, 'sanctum')
            ->postJson("/api/coordinator/applications/{$assignment->id}/approve", [
                'status' => 'confirmed',
            ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            [$volUser],
            ShiftApprovedNotification::class
        );
    }

    public function test_certificate_issued_notification_is_dispatched(): void
    {
        Notification::fake();

        $org = Organization::create(['name' => 'Org A', 'email' => 'orga2@example.com']);
        $volUser = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Volunteer Cert',
            'email'     => 'volcert@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Volunteer',
        ]);
        $vol = Volunteer::create(['user_id' => $volUser->id, 'total_hours' => 25.00]);

        $certService = new CertificateService();
        $certService->generate($vol, 25.00, $org->id);

        Notification::assertSentTo(
            [$volUser],
            CertificateIssuedNotification::class
        );
    }

    public function test_organization_suspended_notification_is_dispatched(): void
    {
        Notification::fake();

        $superAdmin = User::create([
            'full_name' => 'Super Admin',
            'email'     => 'superadmin@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'SuperAdmin',
        ]);

        $org = Organization::create(['name' => 'Org Suspended', 'email' => 'orgsus@example.com', 'status' => 'active']);
        $orgAdmin = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Org Admin',
            'email'     => 'admin@orgsus.com',
            'password'  => bcrypt('password123'),
            'role'      => 'OrgAdmin',
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->patchJson("/api/superadmin/organizations/{$org->id}/status", [
                'status' => 'suspended',
            ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            [$orgAdmin],
            OrganizationSuspendedNotification::class
        );
    }
}
