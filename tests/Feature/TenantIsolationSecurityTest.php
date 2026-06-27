<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\Event;

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
        $orgA = Organization::factory()->create(['name' => 'Tenant A - Red Cross']);
        $userA = User::factory()->create(['org_id' => $orgA->id, 'role' => 'Coordinator']);
        $eventA = Event::factory()->create(['org_id' => $orgA->id, 'title' => 'Blood Drive A']);

        // 2. Setup Tenant B
        $orgB = Organization::factory()->create(['name' => 'Tenant B - UNICEF']);
        $userB = User::factory()->create(['org_id' => $orgB->id, 'role' => 'Coordinator']);
        $eventB = Event::factory()->create(['org_id' => $orgB->id, 'title' => 'Vaccine Drive B']);

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
