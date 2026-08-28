<?php

namespace App\Http\Controllers;

use App\Http\Requests\OnboardTenantRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TenantOnboardingController extends Controller
{
    /**
     * Onboard a new organization tenant and create its administrator account.
     * Restricted to SuperAdmin.
     */
    public function onboard(OnboardTenantRequest $request)
    {
        $result = DB::transaction(function () use ($request) {
            $organization = Organization::create([
                'name'    => $request->org_name,
                'email'   => $request->org_email,
                'address' => $request->org_address,
                'phone'   => $request->org_phone,
                'website' => $request->org_website,
                'status'  => 'active',
            ]);

            $admin = User::create([
                'org_id'    => $organization->id,
                'full_name' => $request->admin_full_name,
                'email'     => $request->admin_email,
                'password'  => Hash::make($request->admin_password),
                'role'      => 'OrgAdmin',
            ]);

            return [
                'organization' => $organization,
                'admin'        => $admin,
            ];
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Organization tenant onboarding completed successfully.',
            'data'    => [
                'organization' => new OrganizationResource($result['organization']),
                'admin'        => new UserResource($result['admin']),
            ],
        ], 201);
    }
}
