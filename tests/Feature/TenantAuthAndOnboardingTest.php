<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class TenantAuthAndOnboardingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test volunteer registration and login.
     */
    public function test_volunteer_can_register_and_login()
    {
        $response = $this->postJson('/api/register', [
            'full_name' => 'John Doe',
            'email' => 'johndoe@example.com',
            'password' => 'password123',
            'skills' => ['first_aid', 'communication'],
            'availability' => ['weekends' => true],
            'bio' => 'Ready to help!',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'status',
                     'message',
                     'access_token',
                     'token_type',
                     'user' => [
                         'id',
                         'full_name',
                         'email',
                         'role',
                         'volunteer'
                     ]
                 ]);

        $this->assertDatabaseHas('users', [
            'email' => 'johndoe@example.com',
            'role' => 'Volunteer',
        ]);

        $this->assertDatabaseHas('volunteers', [
            'bio' => 'Ready to help!',
        ]);

        // Test Login
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'johndoe@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertStatus(200)
                     ->assertJsonStructure([
                         'status',
                         'access_token',
                         'role'
                     ]);
    }

    /**
     * Test Super Admin can onboard a new organization tenant.
     */
    public function test_super_admin_can_onboard_new_tenant()
    {
        $superAdmin = User::create([
            'org_id' => null,
            'full_name' => 'System Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'SuperAdmin',
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')
                         ->postJson('/api/superadmin/onboard-tenant', [
                             'org_name' => 'Greenpeace Ethiopia',
                             'org_email' => 'info@greenpeace.et',
                             'org_address' => 'Bole, Addis Ababa',
                             'admin_full_name' => 'Abebe Kebede',
                             'admin_email' => 'abebe@greenpeace.et',
                             'admin_password' => 'securepassword123',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'status',
                     'message',
                     'data' => [
                         'organization',
                         'admin',
                     ]
                 ]);

        $this->assertDatabaseHas('organizations', [
            'name' => 'Greenpeace Ethiopia',
            'email' => 'info@greenpeace.et',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'abebe@greenpeace.et',
            'role' => 'OrgAdmin',
        ]);
    }

    /**
     * Test role-based authorization blocks non-superadmins from onboarding.
     */
    public function test_non_superadmin_cannot_onboard_tenant()
    {
        $org = Organization::create([
            'name' => 'Test Org',
            'email' => 'test@org.com',
            'address' => 'Test Address',
        ]);

        $coordUser = User::create([
            'org_id' => $org->id,
            'full_name' => 'Coordinator User',
            'email' => 'coord@test.com',
            'password' => Hash::make('password123'),
            'role' => 'Coordinator',
        ]);

        $response = $this->actingAs($coordUser, 'sanctum')
                         ->postJson('/api/superadmin/onboard-tenant', [
                             'org_name' => 'Hackers Org',
                             'org_email' => 'hacked@org.com',
                             'org_address' => 'Nowhere',
                             'admin_full_name' => 'Hacker Admin',
                             'admin_email' => 'hacker@org.com',
                             'admin_password' => 'password123',
                         ]);

        $response->assertStatus(403);
    }

    /**
     * Test strict Multi-Tenancy database query boundary isolation.
     */
    public function test_multi_tenant_isolation_boundary()
    {
        // Create Tenant A and Tenant B
        $orgA = Organization::create([
            'name' => 'Tenant A',
            'email' => 'tenantA@org.com',
        ]);

        $orgB = Organization::create([
            'name' => 'Tenant B',
            'email' => 'tenantB@org.com',
        ]);

        // Create Users for Tenant A and Tenant B
        $coordA = User::create([
            'org_id' => $orgA->id,
            'full_name' => 'Coordinator A',
            'email' => 'coordA@org.com',
            'password' => Hash::make('password123'),
            'role' => 'Coordinator',
        ]);

        $coordB = User::create([
            'org_id' => $orgB->id,
            'full_name' => 'Coordinator B',
            'email' => 'coordB@org.com',
            'password' => Hash::make('password123'),
            'role' => 'Coordinator',
        ]);

        // Create an Event belonging to Tenant A (Created while acting as Coord A)
        $this->actingAs($coordA, 'sanctum');

        $eventA = Event::create([
            'org_id' => $orgA->id, // BelongsToTenant will also handle auto-injecting this
            'title' => 'Red Cross First Aid Training',
            'description' => 'Training description',
            'location' => 'Addis Ababa',
            'start_date' => '2026-06-11',
            'end_date' => '2026-06-12',
            'status' => 'upcoming',
        ]);

        // 1. Verify Coordinator A can see their own Event
        $eventsForA = Event::all();
        $this->assertCount(1, $eventsForA);
        $this->assertEquals($eventA->id, $eventsForA->first()->id);

        // 2. Switch context to Coordinator B
        $this->actingAs($coordB, 'sanctum');

        // 3. Verify Coordinator B CANNOT see Coordinator A's Event due to TenantScope
        $eventsForB = Event::all();
        $this->assertCount(0, $eventsForB);
    }
}
