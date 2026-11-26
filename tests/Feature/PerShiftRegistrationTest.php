<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * An event's first shift having started must not close the later shifts:
 * registration is judged per shift.
 */
class PerShiftRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private Event $event;
    private Shift $morning;
    private Shift $afternoon;
    private User $vol;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::create(['name' => 'Mekedonia', 'email' => 'm@example.org', 'status' => 'active', 'verification_status' => 'verified']);
        $this->event = Event::create([
            'org_id' => $org->id, 'title' => 'Clean-up', 'location' => 'Piassa', 'latitude' => 9.03, 'longitude' => 38.75,
            'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'status' => 'ongoing',
        ]);
        $this->morning = Shift::create([
            'event_id' => $this->event->id, 'start_time' => now()->subHours(4), 'end_time' => now()->subMinutes(10),
            'capacity' => 5, 'qr_secret' => str_repeat('a', 64), 'required_skills' => [],
        ]);
        $this->afternoon = Shift::create([
            'event_id' => $this->event->id, 'start_time' => now()->addMinutes(5), 'end_time' => now()->addHours(4),
            'capacity' => 5, 'qr_secret' => str_repeat('b', 64), 'required_skills' => [],
        ]);
        $this->vol = User::create(['org_id' => null, 'full_name' => 'Abel One', 'email' => 'abel@ex.com', 'password' => Hash::make('password'), 'role' => 'Volunteer']);
        Volunteer::create(['user_id' => $this->vol->id, 'skills' => [], 'total_hours' => 0, 'impact_score' => 0, 'date_of_birth' => '1995-01-01']);
    }

    public function test_later_shift_stays_open_after_the_first_shift_started(): void
    {
        $this->actingAs($this->vol->fresh(), 'sanctum')->getJson('/api/volunteer/events')
            ->assertOk()->assertJsonPath('data.0.id', $this->event->id);

        $this->actingAs($this->vol->fresh(), 'sanctum')->postJson("/api/volunteer/apply/{$this->afternoon->id}")->assertStatus(201);
    }

    public function test_started_shift_is_closed(): void
    {
        $this->actingAs($this->vol->fresh(), 'sanctum')->postJson("/api/volunteer/apply/{$this->morning->id}")->assertStatus(422);
    }
}
