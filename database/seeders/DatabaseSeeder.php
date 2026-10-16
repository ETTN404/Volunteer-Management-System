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
        User::updateOrCreate(
            ['email' => 'superadmin@vms.com'],
            [
                'org_id' => null,
                'full_name' => 'General System Admin',
                'password' => Hash::make('password'),
                'role' => 'SuperAdmin',
            ]
        );

        // 2. Create Organization A: Red Cross Ethiopia
        $redCross = Organization::firstOrCreate(
            ['email' => 'contact@redcross.org'],
            [
                'name' => 'Red Cross Ethiopia',
                'address' => 'Addis Ababa, Ethiopia',
                'status' => 'active',
            ]
        );

        // Red Cross Users
        User::updateOrCreate(
            ['email' => 'redcross.admin@vms.com'],
            [
                'org_id' => $redCross->id,
                'full_name' => 'Red Cross Admin',
                'password' => Hash::make('password'),
                'role' => 'OrgAdmin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'redcross.coord@vms.com'],
            [
                'org_id' => $redCross->id,
                'full_name' => 'Red Cross Coordinator',
                'password' => Hash::make('password'),
                'role' => 'Coordinator',
            ]
        );

        $rcVolUser = User::updateOrCreate(
            ['email' => 'redcross.vol@vms.com'],
            [
                'org_id' => $redCross->id,
                'full_name' => 'Red Cross Volunteer',
                'password' => Hash::make('password'),
                'role' => 'Volunteer',
            ]
        );

        Volunteer::updateOrCreate(
            ['user_id' => $rcVolUser->id],
            [
                'skills' => ['first_aid', 'disaster_response', 'translation'],
                'availability' => ['weekends' => true, 'weekdays_morning' => true],
                'total_hours' => 12.5,
                'impact_score' => 4.8,
                'bio' => 'Dedicated humanitarian volunteer passionate about community service and emergency response.',
            ]
        );

        // 3. Create Organization B: Save the Children
        $saveChildren = Organization::firstOrCreate(
            ['email' => 'info@savethechildren.org'],
            [
                'name' => 'Save the Children',
                'address' => 'Addis Ababa, Ethiopia',
                'status' => 'active',
            ]
        );

        // Save the Children Users
        User::updateOrCreate(
            ['email' => 'savechildren.admin@vms.com'],
            [
                'org_id' => $saveChildren->id,
                'full_name' => 'Save the Children Admin',
                'password' => Hash::make('password'),
                'role' => 'OrgAdmin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'savechildren.coord@vms.com'],
            [
                'org_id' => $saveChildren->id,
                'full_name' => 'Save the Children Coordinator',
                'password' => Hash::make('password'),
                'role' => 'Coordinator',
            ]
        );

        $scVolUser = User::updateOrCreate(
            ['email' => 'savechildren.vol@vms.com'],
            [
                'org_id' => $saveChildren->id,
                'full_name' => 'Save the Children Volunteer',
                'password' => Hash::make('password'),
                'role' => 'Volunteer',
            ]
        );

        Volunteer::updateOrCreate(
            ['user_id' => $scVolUser->id],
            [
                'skills' => ['teaching', 'child_care', 'storytelling'],
                'availability' => ['saturdays' => true, 'weekdays_afternoon' => true],
                'total_hours' => 25.0,
                'impact_score' => 4.9,
                'bio' => 'Eager to educate and support child welfare program developments globally.',
            ]
        );
    }
}
