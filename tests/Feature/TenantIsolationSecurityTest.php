<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationSecurityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that a user from Tenant A cannot see events from Tenant B.
     * This verifies the TenantScope logic.
     */
    public function test_tenant_a_cannot_access_tenant_b_data()
    {
        // 1. Setup Tenant A
        $orgA = Organization::create(['name' => 'Tenant A - Red Cross', 'email' => 'redcross@example.com']);
        $userA = User::create([
            'org_id'    => $orgA->id,
            'full_name' => 'Coord A',
            'email'     => 'coorda@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Coordinator',
        ]);
        $eventA = Event::create([
            'org_id'     => $orgA->id,
            'title'      => 'Blood Drive A',
            'location'   => 'Location A',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
        ]);

        // 2. Setup Tenant B
        $orgB = Organization::create(['name' => 'Tenant B - UNICEF', 'email' => 'unicef@example.com']);
        $userB = User::create([
            'org_id'    => $orgB->id,
            'full_name' => 'Coord B',
            'email'     => 'coordb@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Coordinator',
        ]);
        $eventB = Event::create([
            'org_id'     => $orgB->id,
            'title'      => 'Vaccine Drive B',
            'location'   => 'Location B',
            'start_date' => now()->toDateString(),
            'end_date'   => now()->addDays(2)->toDateString(),
        ]);

        // 3. Authenticate as User A and attempt to fetch events
        $responseA = $this->actingAs($userA, 'sanctum')->getJson('/api/coordinator/events');
        
        $responseA->assertStatus(200);
        $responseA->assertJsonFragment(['title' => 'Blood Drive A']);
        $responseA->assertJsonMissing(['title' => 'Vaccine Drive B']);

        // 4. Authenticate as User B and attempt to fetch events
        $responseB = $this->actingAs($userB, 'sanctum')->getJson('/api/coordinator/events');
        
        $responseB->assertStatus(200);
        $responseB->assertJsonFragment(['title' => 'Vaccine Drive B']);
        $responseB->assertJsonMissing(['title' => 'Blood Drive A']);
    }
}
