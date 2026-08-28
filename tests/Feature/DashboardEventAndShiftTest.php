<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardEventAndShiftTest extends TestCase
{
    use RefreshDatabase;

    private $org;
    private $coord;
    private $volUser;
    private $volunteer;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup base data
        $this->org = Organization::create([
            'name' => 'Red Cross Ethiopia',
            'email' => 'addis@redcross.org',
        ]);

        $this->coord = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Coordinator Abebe',
            'email' => 'abebe@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Coordinator',
        ]);

        $this->volUser = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Volunteer Chala',
            'email' => 'chala@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        $this->volunteer = Volunteer::create([
            'user_id' => $this->volUser->id,
            'skills' => ['first_aid', 'disaster_response'],
            'availability' => ['weekends' => true],
            'total_hours' => 0.00,
            'impact_score' => 0.00,
        ]);
    }

    /**
     * Test creating an event and scheduling shifts with timing validation.
     */
    public function test_event_and_shift_creation_flow()
    {
        $startDate  = now()->addDays(5)->toDateString();
        $endDate    = now()->addDays(10)->toDateString();
        $shiftStart = now()->addDays(6)->setTime(9, 0)->format('Y-m-d H:i:s');
        $shiftEnd   = now()->addDays(6)->setTime(12, 0)->format('Y-m-d H:i:s');
        $badStart   = now()->addDays(15)->setTime(9, 0)->format('Y-m-d H:i:s');
        $badEnd     = now()->addDays(15)->setTime(12, 0)->format('Y-m-d H:i:s');

        $response = $this->actingAs($this->coord, 'sanctum')
                         ->postJson('/api/coordinator/events', [
                             'title' => 'Disaster Response Drill',
                             'description' => 'Simulated disaster training',
                             'location' => 'Addis Ababa Stadium',
                             'latitude' => 9.010000,
                             'longitude' => 38.740000,
                             'start_date' => $startDate,
                             'end_date' => $endDate,
                         ]);

        $response->assertStatus(201);
        $eventId = $response->json('data.id');

        // Test Shift within boundaries (Succeeds)
        $shiftResponse = $this->actingAs($this->coord, 'sanctum')
                              ->postJson("/api/coordinator/events/{$eventId}/shifts", [
                                  'start_time' => $shiftStart,
                                  'end_time' => $shiftEnd,
                                  'required_skills' => ['first_aid'],
                                  'capacity' => 10,
                              ]);
        $shiftResponse->assertStatus(201);

        // Test Shift outside event boundaries (Fails with 422)
        $badShiftResponse = $this->actingAs($this->coord, 'sanctum')
                                 ->postJson("/api/coordinator/events/{$eventId}/shifts", [
                                     'start_time' => $badStart,
                                     'end_time' => $badEnd,
                                     'required_skills' => ['first_aid'],
                                     'capacity' => 10,
                                 ]);
        $badShiftResponse->assertStatus(422)
                         ->assertJsonPath('status', 'error')
                         ->assertJsonFragment([
                             'status' => 'error',
                         ]);
    }

    /**
     * Test personalized skill matching score calculations.
     */
    public function test_volunteer_skill_matching_scores()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Disaster Response',
            'location' => 'Addis Ababa',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        // Shift 1: 100% Match (first_aid is owned by volunteer)
        $shift1 = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'required_skills' => ['first_aid'],
            'capacity' => 5,
        ]);

        // Shift 2: 50% Match (disaster_response is matched, teaching is not)
        $shift2 = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 13:00:00',
            'end_time' => '2026-06-16 15:00:00',
            'required_skills' => ['disaster_response', 'teaching'],
            'capacity' => 5,
        ]);

        $response = $this->actingAs($this->volUser, 'sanctum')
                         ->getJson('/api/volunteer/events');

        $response->assertStatus(200);

        // Find Shifts in the response and assert match scores
        $shifts = $response->json('data.0.shifts');
        
        $this->assertEquals(100.00, $shifts[0]['match_score']);
        $this->assertEquals(50.00, $shifts[1]['match_score']);
    }

    /**
     * Test automated shift timing overlap / conflict detection.
     */
    public function test_automated_shift_overlap_conflict_detection()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Disaster Response',
            'location' => 'Addis Ababa',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        // Shift A: 09:00 to 12:00
        $shiftA = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'capacity' => 5,
        ]);

        // Shift B (Overlapping): 10:00 to 11:30
        $shiftB = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 10:00:00',
            'end_time' => '2026-06-16 11:30:00',
            'capacity' => 5,
        ]);

        // 1. Volunteer applies for Shift A (Succeeds)
        $applyAResponse = $this->actingAs($this->volUser, 'sanctum')
                               ->postJson("/api/volunteer/apply/{$shiftA->id}");
        $applyAResponse->assertStatus(201);

        // 2. Volunteer tries to apply for Shift B (Fails due to Timing Conflict)
        $applyBResponse = $this->actingAs($this->volUser, 'sanctum')
                               ->postJson("/api/volunteer/apply/{$shiftB->id}");
        $applyBResponse->assertStatus(422)
                       ->assertJsonFragment([
                           'status' => 'error',
                           'message' => 'Scheduling Conflict: This shift overlaps with another shift you are already scheduled for or have applied to.'
                       ]);
    }

    /**
     * Test capacity limit boundaries when approving registrations.
     */
    public function test_shift_capacity_boundaries_on_approval()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Disaster Response',
            'location' => 'Addis Ababa',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        // Shift capacity = 1
        $shift = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'capacity' => 1,
        ]);

        // Create Volunteer 2
        $volUser2 = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Volunteer Chala 2',
            'email' => 'chala2@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        $volunteer2 = Volunteer::create([
            'user_id' => $volUser2->id,
            'skills' => ['first_aid'],
        ]);

        // Create Assignments
        $assignment1 = ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'pending',
        ]);

        $assignment2 = ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $volunteer2->id,
            'status' => 'pending',
        ]);

        // Coordinator approves Volunteer 1 (Succeeds)
        $approve1 = $this->actingAs($this->coord, 'sanctum')
                         ->postJson("/api/coordinator/applications/{$assignment1->id}/approve", [
                             'status' => 'confirmed'
                         ]);
        $approve1->assertStatus(200);

        // Coordinator tries to approve Volunteer 2 (Fails due to Capacity Limit Overage)
        $approve2 = $this->actingAs($this->coord, 'sanctum')
                         ->postJson("/api/coordinator/applications/{$assignment2->id}/approve", [
                             'status' => 'confirmed'
                         ]);
        $approve2->assertStatus(422)
                 ->assertJsonFragment([
                     'status' => 'error',
                     'message' => 'Shift capacity has already been reached.'
                 ]);
    }
}
