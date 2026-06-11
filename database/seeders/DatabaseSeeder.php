<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Super Admin (No organization)
        User::create([
            'org_id' => null,
            'full_name' => 'General System Admin',
            'email' => 'superadmin@vms.com',
            'password' => Hash::make('password'),
            'role' => 'SuperAdmin',
        ]);

        // 2. Create Organization A: Red Cross Ethiopia
        $redCross = Organization::create([
            'name' => 'Red Cross Ethiopia',
            'email' => 'contact@redcross.org',
            'address' => 'Addis Ababa, Ethiopia',
            'status' => 'active',
        ]);

        // Red Cross Users
        User::create([
            'org_id' => $redCross->id,
            'full_name' => 'Red Cross Admin',
            'email' => 'redcross.admin@vms.com',
            'password' => Hash::make('password'),
            'role' => 'OrgAdmin',
        ]);

        User::create([
            'org_id' => $redCross->id,
            'full_name' => 'Red Cross Coordinator',
            'email' => 'redcross.coord@vms.com',
            'password' => Hash::make('password'),
            'role' => 'Coordinator',
        ]);

        $rcVolUser = User::create([
            'org_id' => $redCross->id,
            'full_name' => 'Red Cross Volunteer',
            'email' => 'redcross.vol@vms.com',
            'password' => Hash::make('password'),
            'role' => 'Volunteer',
        ]);

        Volunteer::create([
            'user_id' => $rcVolUser->id,
            'skills' => ['first_aid', 'disaster_response', 'translation'],
            'availability' => ['weekends' => true, 'weekdays_morning' => true],
            'total_hours' => 12.5,
            'impact_score' => 4.8,
            'bio' => 'Dedicated humanitarian volunteer passionate about community service and emergency response.',
        ]);

        // 3. Create Organization B: Save the Children
        $saveChildren = Organization::create([
            'name' => 'Save the Children',
            'email' => 'info@savethechildren.org',
            'address' => 'Addis Ababa, Ethiopia',
            'status' => 'active',
        ]);

        // Save the Children Users
        User::create([
            'org_id' => $saveChildren->id,
            'full_name' => 'Save the Children Admin',
            'email' => 'savechildren.admin@vms.com',
            'password' => Hash::make('password'),
            'role' => 'OrgAdmin',
        ]);

        User::create([
            'org_id' => $saveChildren->id,
            'full_name' => 'Save the Children Coordinator',
            'email' => 'savechildren.coord@vms.com',
            'password' => Hash::make('password'),
            'role' => 'Coordinator',
        ]);

        $scVolUser = User::create([
            'org_id' => $saveChildren->id,
            'full_name' => 'Save the Children Volunteer',
            'email' => 'savechildren.vol@vms.com',
            'password' => Hash::make('password'),
            'role' => 'Volunteer',
        ]);

        Volunteer::create([
            'user_id' => $scVolUser->id,
            'skills' => ['teaching', 'child_care', 'storytelling'],
            'availability' => ['saturdays' => true, 'weekdays_afternoon' => true],
            'total_hours' => 25.0,
            'impact_score' => 4.9,
            'bio' => 'Eager to educate and support child welfare program developments globally.',
        ]);
    }
}
