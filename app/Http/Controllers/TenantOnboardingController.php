<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class TenantOnboardingController extends Controller
{
    /**
     * Onboard a new organization tenant and create its administrator account.
     * Restricted to SuperAdmin.
     */
    public function onboard(Request $request)
    {
        $request->validate([
            // Org Details
            'org_name' => 'required|string|max:150',
            'org_email' => 'required|string|email|max:100|unique:organizations,email',
            'org_address' => 'required|string|max:255',
            
            // Admin Details
            'admin_full_name' => 'required|string|max:100',
            'admin_email' => 'required|string|email|max:100|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ]);

        $result = DB::transaction(function () use ($request) {
            // 1. Create Organization
            $organization = Organization::create([
                'name' => $request->org_name,
                'email' => $request->org_email,
                'address' => $request->org_address,
                'status' => 'active',
            ]);

            // 2. Create Org Admin
            $admin = User::create([
                'org_id' => $organization->id,
                'full_name' => $request->admin_full_name,
                'email' => $request->admin_email,
                'password' => Hash::make($request->admin_password),
                'role' => 'OrgAdmin',
            ]);

            return [
                'organization' => $organization,
                'admin' => $admin,
            ];
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Organization tenant onboarding completed successfully.',
            'data' => [
                'organization' => $result['organization'],
                'admin' => $result['admin'],
            ]
        ], 201);
    }
}
