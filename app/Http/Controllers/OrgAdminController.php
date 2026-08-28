<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateCoordinatorRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\VolunteerResource;
use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\Hash;

class OrgAdminController extends Controller
{
    public function __construct(private AuditLogService $audit) {}

    /**
     * Get the settings and details of the authenticated OrgAdmin's organization.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getOrganization()
    {
        $org = Organization::findOrFail(auth()->user()->org_id);

        return response()->json([
            'status' => 'success',
            'data'   => new OrganizationResource($org),
        ]);
    }

    /**
     * Update the organization's settings (name, address, phone, website).
     * Sensitive fields (email, status, subscription_plan) are protected — only SuperAdmin can change those.
     *
     * @param  UpdateOrganizationRequest  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateOrganization(UpdateOrganizationRequest $request)
    {
        $org     = Organization::findOrFail(auth()->user()->org_id);
        $oldData = $org->only(['name', 'address', 'phone', 'website']);

        $org->update($request->only(['name', 'address', 'phone', 'website']));

        $this->audit->log('organization.updated', $org, $oldData, $org->fresh()->only(['name', 'address', 'phone', 'website']));

        return response()->json([
            'status'  => 'success',
            'message' => 'Organization settings updated successfully.',
            'data'    => new OrganizationResource($org->fresh()),
        ]);
    }

    /**
     * Create a new Coordinator account within this organization.
     *
     * @param  CreateCoordinatorRequest  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createCoordinator(CreateCoordinatorRequest $request)
    {
        $coordinator = User::create([
            'org_id'    => auth()->user()->org_id,
            'full_name' => $request->full_name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'Coordinator',
        ]);

        $this->audit->log('user.coordinator_created', $coordinator);

        return response()->json([
            'status'  => 'success',
            'message' => 'Coordinator account created successfully.',
            'data'    => new UserResource($coordinator),
        ], 201);
    }

    /**
     * List all users (volunteers and coordinators) in this organization.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listMembers()
    {
        $members = User::where('org_id', auth()->user()->org_id)
            ->where('role', '!=', 'OrgAdmin')
            ->with('volunteer')
            ->latest()
            ->paginate(config('vms.per_page', 20));

        return response()->json([
            'status'     => 'success',
            'data'       => UserResource::collection($members->items()),
            'pagination' => [
                'current_page' => $members->currentPage(),
                'last_page'    => $members->lastPage(),
                'per_page'     => $members->perPage(),
                'total'        => $members->total(),
            ],
        ]);
    }

    /**
     * Deactivate or reactivate a volunteer's account in this organization.
     * Deactivated volunteers cannot log in or use the system.
     *
     * @param  int  $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleVolunteerStatus($userId)
    {
        $user = User::where('org_id', auth()->user()->org_id)
            ->where('id', $userId)
            ->where('role', 'Volunteer')
            ->firstOrFail();

        $newStatus = !((bool) $user->is_active);
        $user->update(['is_active' => $newStatus]);

        $action  = $newStatus ? 'volunteer.reactivated' : 'volunteer.deactivated';
        $message = $newStatus ? 'Volunteer account reactivated.' : 'Volunteer account deactivated.';

        $this->audit->log($action, $user);

        return response()->json([
            'status'    => 'success',
            'message'   => $message,
            'is_active' => $newStatus,
        ]);
    }

    /**
     * View the full profile and reliability metrics of a specific volunteer in this org.
     *
     * @param  int  $volunteerId
     * @return \Illuminate\Http\JsonResponse
     */
    public function viewVolunteer($volunteerId)
    {
        $volunteer = Volunteer::with('user')
            ->whereHas('user', fn ($q) => $q->where('org_id', auth()->user()->org_id))
            ->findOrFail($volunteerId);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'volunteer'          => new VolunteerResource($volunteer->load('user')),
                'reliability'        => $volunteer->getReliabilityMetrics(),
                'skills_alignment'   => $volunteer->getSkillsAlignment(),
            ],
        ]);
    }
}
