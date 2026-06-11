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
use Tests\TestCase;

class AdvancedSaaSVisualMockupsTest extends TestCase
{
    use RefreshDatabase;

    private $org;
    private $coord;
    private $volUser;
    private $volunteer;

    protected function setUp(): void
    {
        parent::setUp();

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
            'full_name' => 'Sarah Jenkins',
            'email' => 'sarah@redcross.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        $this->volunteer = Volunteer::create([
            'user_id' => $this->volUser->id,
            'skills' => ['first_aid'],
        ]);
    }

    /**
     * Test the Volunteer Reliability Rating and Skills Alignment systems.
     */
    public function test_volunteer_reliability_and_skills_alignment()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Crisis Response',
            'location' => 'Addis',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        $shift = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'capacity' => 5,
        ]);

        // Create 2 confirmed shift assignments
        ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'confirmed',
        ]);

        $shift2 = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-17 09:00:00',
            'end_time' => '2026-06-17 12:00:00',
            'capacity' => 5,
        ]);

        ShiftAssignment::create([
            'shift_id' => $shift2->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'confirmed',
        ]);

        // Checked-in to only 1 out of 2 assigned shifts (50% attendance rate)
        Attendance::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'check_in_time' => '2026-06-16 08:55:00', // On-time (before 09:00 AM)
            'qr_verified' => true,
        ]);

        // Get live metrics
        $metrics = $this->volunteer->getReliabilityMetrics();

        $this->assertEquals(50.00, $metrics['attendance_rate']);
        $this->assertEquals(100.00, $metrics['on_time_rate']); // 1 check-in and it was on-time!

        // Get skills spider chart dimensions
        $dimensions = $this->volunteer->getSkillsAlignment();
        $this->assertEquals(95, $dimensions['Medical']); // Boosted due to 'first_aid'
        $this->assertEquals(80, $dimensions['Crisis_Management']); // Boosted due to 'first_aid'
    }

    /**
     * Test the AI-Drafted constructive feedback suggestion system for applicants (Guardian Queue).
     */
    public function test_ai_drafted_feedback_suggester()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Crisis Response',
            'location' => 'Addis',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        // Shift requires first_aid and teaching
        $shift = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'required_skills' => ['first_aid', 'teaching'],
            'capacity' => 5,
        ]);

        $assignment = ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'pending',
        ]);

        // Trigger the feedback suggestion endpoint
        $response = $this->actingAs($this->coord, 'sanctum')
                         ->getJson("/api/coordinator/applications/{$assignment->id}/ai-feedback");

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'status' => 'success',
                     'assignment_id' => (string) $assignment->id,
                 ]);

        // Should correctly detect that 'teaching' is missing on Sarah's profile!
        $this->assertEquals(['teaching'], $response->json('missing_skills'));
        $this->assertStringContainsString("we'd love to have you onboard, but we need an updated certificate or experience verification for: Teaching", $response->json('ai_drafted_feedback'));
    }

    /**
     * Test the manual override check-in signature capture system (VolunTrack).
     */
    public function test_manual_checkin_signature_override()
    {
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Crisis Response',
            'location' => 'Addis',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        $shift = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'capacity' => 5,
        ]);

        $assignment = ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'status' => 'confirmed',
        ]);

        // Coordinators manual bypass with hand-drawn signature data (base64 string)
        $signatureBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

        $response = $this->actingAs($this->coord, 'sanctum')
                         ->postJson("/api/coordinator/applications/{$assignment->id}/force-checkin", [
                             'signature_data' => $signatureBase64,
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'success')
                 ->assertJsonPath('data.qr_verified', false); // false because override!

        $this->assertDatabaseHas('attendances', [
            'shift_id' => $shift->id,
            'volunteer_id' => $this->volunteer->id,
            'qr_verified' => false,
            'signature_data' => $signatureBase64,
        ]);
    }
}
