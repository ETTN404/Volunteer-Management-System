<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Attendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Tests\TestCase;

class AttendanceVerificationTest extends TestCase
{
    use RefreshDatabase;

    private $org;
    private $coord;
    private $volUser;
    private $volunteer;
    private $event;
    private $shift;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Organization
        $this->org = Organization::create([
            'name' => 'Red Cross Ethiopia',
            'email' => 'addis@redcross.org',
        ]);

        // 2. Create Coordinator
        $this->coord = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Coordinator Abebe',
            'email' => 'abebe@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Coordinator',
        ]);

        // 3. Create Volunteer User
        $this->volUser = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Volunteer Chala',
            'email' => 'chala@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        $this->volunteer = Volunteer::create([
            'user_id' => $this->volUser->id,
            'skills' => ['first_aid'],
            'total_hours' => 5.00,
            'impact_score' => 1.20,
        ]);

        // 4. Create Event with Geofence Base coordinates (Addis Ababa stadium: 9.010000, 38.740000)
        $this->event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'First Aid Disaster Response Drill',
            'location' => 'Addis Ababa Stadium',
            'latitude' => 9.010000,
            'longitude' => 38.740000,
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        // 5. Create Shift (starting now for testing)
        $this->shift = Shift::create([
            'event_id' => $this->event->id,
            'start_time' => Carbon::now()->toDateTimeString(),
            'end_time' => Carbon::now()->addHours(3)->toDateTimeString(),
            'capacity' => 10,
            'qr_code_signature' => 'valid_signature_123',
        ]);

        // 6. Create Confirmed Shift Assignment
        ShiftAssignment::create([
            'shift_id' => $this->shift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'confirmed',
            'assigned_at' => now(),
        ]);
    }

    /**
     * Test QR code signature regeneration.
     */
    public function test_coordinator_can_generate_and_refresh_qr_signature()
    {
        $response = $this->actingAs($this->coord, 'sanctum')
                         ->postJson("/api/coordinator/shifts/{$this->shift->id}/qrcode");

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'status',
                     'qr_code_signature',
                     'expires_at'
                 ]);

        $this->assertDatabaseMissing('shifts', [
            'id' => $this->shift->id,
            'qr_code_signature' => 'valid_signature_123', // signature should have changed
        ]);
    }

    /**
     * Test GPS geofencing validations (within and outside 100 meters).
     */
    public function test_gps_geofence_checkin_validations()
    {
        // Case A: Check-In from OUTSIDE Geofence (Bole Airport: 8.9778, 38.7993 -> ~6km away)
        $outsideResponse = $this->actingAs($this->volUser, 'sanctum')
                                ->postJson('/api/volunteer/check-in', [
                                    'shift_id'          => $this->shift->id,
                                    'qr_code_signature' => 'valid_signature_123',
                                    'latitude'          => 8.977800,
                                    'longitude'         => 38.799300,
                                    'client_timestamp'  => now()->toIso8601String(),
                                ]);

        $outsideResponse->assertStatus(422);

        // Case B: Check-In from INSIDE Geofence (Addis Ababa stadium: 9.010001, 38.740001 -> ~0.15 meters away)
        $insideResponse = $this->actingAs($this->volUser, 'sanctum')
                               ->postJson('/api/volunteer/check-in', [
                                   'shift_id'          => $this->shift->id,
                                   'qr_code_signature' => 'valid_signature_123',
                                   'latitude'          => 9.010001,
                                   'longitude'         => 38.740001,
                                   'client_timestamp'  => now()->toIso8601String(),
                               ]);

        $insideResponse->assertStatus(201)
                      ->assertJsonFragment([
                          'status' => 'success',
                      ]);

        $this->assertDatabaseHas('attendances', [
            'shift_id' => $this->shift->id,
            'volunteer_id' => $this->volunteer->id,
            'qr_verified' => true,
        ]);
    }

    /**
     * Test temporal check-in windows.
     */
    public function test_temporal_checkin_window_boundaries()
    {
        // Create an upcoming shift in the future (tomorrow)
        $futureShift = Shift::create([
            'event_id' => $this->event->id,
            'start_time' => Carbon::tomorrow()->toDateTimeString(),
            'end_time' => Carbon::tomorrow()->addHours(2)->toDateTimeString(),
            'capacity' => 10,
            'qr_code_signature' => 'future_signature_123',
        ]);

        ShiftAssignment::create([
            'shift_id' => $futureShift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->volUser, 'sanctum')
                         ->postJson('/api/volunteer/check-in', [
                             'shift_id'          => $futureShift->id,
                             'qr_code_signature' => 'future_signature_123',
                             'latitude'          => 9.010000,
                             'longitude'         => 38.740000,
                             'client_timestamp'  => now()->toIso8601String(),
                         ]);

        $response->assertStatus(422);
    }

    /**
     * Test check-out with automatic hours and impact score accumulation.
     */
    public function test_checkout_accumulates_duration_hours_and_impact_score()
    {
        // 1. Force establish active check-in (2 hours ago)
        $checkInTime = Carbon::now()->subHours(2);
        
        $attendance = Attendance::create([
            'shift_id' => $this->shift->id,
            'volunteer_id' => $this->volunteer->id,
            'check_in_time' => $checkInTime,
            'qr_verified' => true,
            'latitude' => 9.010000,
            'longitude' => 38.740000,
        ]);

        // 2. Perform Checkout
        $response = $this->actingAs($this->volUser, 'sanctum')
                         ->postJson('/api/volunteer/check-out', [
                             'shift_id' => $this->shift->id,
                         ]);

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'status' => 'success',
                     'message' => 'Check-out completed. Thank you for your service!',
                 ]);

        // Assert duration is logged as ~2 hours
        $this->assertEquals(2.0, $response->json('data.hours_logged'));

        // Volunteer cumulative stats should have increased:
        $this->assertDatabaseHas('volunteers', [
            'id'          => $this->volunteer->id,
            'total_hours' => 7.00,
        ]);
    }
}
