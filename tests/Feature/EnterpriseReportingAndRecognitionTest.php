<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\Event;
use App\Models\Shift;
use App\Models\Certificate;
use App\Models\Report;
use App\Models\Announcement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use Tests\TestCase;

class EnterpriseReportingAndRecognitionTest extends TestCase
{
    use RefreshDatabase;

    private $org;
    private $coord;
    private $volUser;
    private $volunteer;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

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
            'total_hours' => 25.00, // Meets the 20h milestone, but not 50h
            'impact_score' => 4.50,
        ]);
    }

    /**
     * Test certificate generation rules and boundaries.
     */
    public function test_milestone_certificate_generation_boundaries()
    {
        // Case A: Generate 50-hour certificate (Fails because Sarah has only 25 hours)
        $failResponse = $this->actingAs($this->coord, 'sanctum')
                             ->postJson('/api/coordinator/certificates', [
                                 'volunteer_id' => $this->volunteer->id,
                                 'milestone_hours' => 50,
                             ]);

        $failResponse->assertStatus(422)
                     ->assertJsonFragment([
                         'status' => 'error',
                     ]);

        // Case B: Generate 20-hour certificate (Succeeds)
        $successResponse = $this->actingAs($this->coord, 'sanctum')
                                ->postJson('/api/coordinator/certificates', [
                                    'volunteer_id' => $this->volunteer->id,
                                    'milestone_hours' => 20,
                                ]);

        $successResponse->assertStatus(201)
                        ->assertJsonPath('status', 'success');

        $certificateId = $successResponse->json('data.id');

        $this->assertDatabaseHas('certificates', [
            'volunteer_id' => $this->volunteer->id,
            'milestone_hours' => 20.00,
        ]);

        // Case C: Volunteer can download the certificate
        $downloadResponse = $this->actingAs($this->volUser, 'sanctum')
                                 ->getJson("/api/volunteer/certificates/{$certificateId}/download");

        $downloadResponse->assertStatus(200);
    }

    /**
     * Test donor impact reporting aggregations.
     */
    public function test_donor_impact_reporting_compilation()
    {
        $response = $this->actingAs($this->coord, 'sanctum')
                         ->postJson('/api/coordinator/reports', [
                             'period' => 'Q1 2026',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('reports', [
            'period' => 'Q1 2026',
            'total_volunteers' => 1,
            'total_hours' => 25.00,
        ]);

        // Verify report file was saved to storage
        $filePath = str_replace('storage/', 'public/', $response->json('data.file_path'));
        Storage::assertExists($filePath);
    }

    /**
     * Test urgent shift broadcasts filter based on qualified skills.
     */
    public function test_urgent_shift_broadcast_filters_by_skills()
    {
        // 1. Create a shift requiring 'first_aid'
        $event = Event::create([
            'org_id' => $this->org->id,
            'title' => 'Crisis Response',
            'location' => 'Bole',
            'start_date' => '2026-06-15',
            'end_date' => '2026-06-20',
        ]);

        $shift = Shift::create([
            'event_id' => $event->id,
            'start_time' => '2026-06-16 09:00:00',
            'end_time' => '2026-06-16 12:00:00',
            'required_skills' => ['first_aid'],
            'capacity' => 5,
        ]);

        // 2. Create another Volunteer who has 'cooking' (not first_aid)
        $otherUser = User::create([
            'org_id' => $this->org->id,
            'full_name' => 'Chef Chala',
            'email' => 'chala@chef.org',
            'password' => Hash::make('password123'),
            'role' => 'Volunteer',
        ]);

        Volunteer::create([
            'user_id' => $otherUser->id,
            'skills' => ['cooking'],
        ]);

        // 3. Trigger Urgent Broadcast
        $response = $this->actingAs($this->coord, 'sanctum')
                         ->postJson("/api/coordinator/shifts/{$shift->id}/broadcast");

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'success')
                 ->assertJsonPath('notified_volunteers_count', 1) // Only Sarah is notified!
                 ->assertJsonFragment([
                     'notified_list' => ['Sarah Jenkins']
                 ]);

        // Assert announcement created in DB
        $this->assertDatabaseHas('announcements', [
            'org_id' => $this->org->id,
            'target_audience' => 'volunteers',
        ]);
    }
}
