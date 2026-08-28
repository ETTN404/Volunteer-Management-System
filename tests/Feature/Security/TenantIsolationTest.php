<?php

namespace Tests\Feature\Security;

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_from_org_a_cannot_access_org_b_events(): void
    {
        // Create Tenant A
        $orgA = Organization::create([
            'name'    => 'Organization A',
            'email'   => 'orga@example.com',
            'status'  => 'active',
        ]);

        $userA = User::create([
            'org_id'    => $orgA->id,
            'full_name' => 'Alice A',
            'email'     => 'alice@orga.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Coordinator',
        ]);

        // Create Tenant B & Event B
        $orgB = Organization::create([
            'name'    => 'Organization B',
            'email'   => 'orgb@example.com',
            'status'  => 'active',
        ]);

        $eventB = Event::create([
            'org_id'     => $orgB->id,
            'title'      => 'Secret Event B',
            'location'   => 'Location B',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
            'status'     => 'upcoming',
        ]);

        // User A requests coordinator events
        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/coordinator/events');

        $response->assertStatus(200);

        // Assert Event B is NOT leaked in User A's response
        $response->assertJsonMissing([
            'title' => 'Secret Event B',
        ]);
    }
}
