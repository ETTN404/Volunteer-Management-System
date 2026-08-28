<?php

namespace Tests\Feature\Security;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_volunteer_cannot_access_coordinator_endpoints(): void
    {
        $org = Organization::create([
            'name'   => 'Test Org',
            'email'  => 'org@example.com',
            'status' => 'active',
        ]);

        $volunteerUser = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Volunteer Bob',
            'email'     => 'bob@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Volunteer',
        ]);

        // Attempt coordinator endpoint
        $response = $this->actingAs($volunteerUser, 'sanctum')
            ->postJson('/api/coordinator/events', [
                'title'      => 'Hacked Event',
                'location'   => 'Nowhere',
                'start_date' => now()->toDateString(),
                'end_date'   => now()->addDay()->toDateString(),
            ]);

        $response->assertStatus(403);
    }

    public function test_coordinator_cannot_access_superadmin_endpoints(): void
    {
        $org = Organization::create([
            'name'   => 'Test Org',
            'email'  => 'org2@example.com',
            'status' => 'active',
        ]);

        $coordUser = User::create([
            'org_id'    => $org->id,
            'full_name' => 'Coordinator Claire',
            'email'     => 'claire@example.com',
            'password'  => bcrypt('password123'),
            'role'      => 'Coordinator',
        ]);

        // Attempt SuperAdmin onboard endpoint
        $response = $this->actingAs($coordUser, 'sanctum')
            ->postJson('/api/superadmin/onboard-tenant', [
                'org_name'        => 'Unauthorized Org',
                'org_email'       => 'unauth@example.com',
                'org_address'     => '123 St',
                'admin_full_name' => 'Admin Unauthorized',
                'admin_email'     => 'adminunauth@example.com',
                'admin_password'  => 'password123',
            ]);

        $response->assertStatus(403);
    }
}
