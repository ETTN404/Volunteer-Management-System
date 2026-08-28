<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class SuperAdminController extends Controller
{
    public function __construct(private AuditLogService $audit) {}

    /**
     * Get system-wide high-level metrics for SuperAdmin dashboard.
     */
    public function dashboardMetrics()
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_organizations' => Organization::count(),
                'active_organizations' => Organization::where('status', 'active')->count(),
                'total_users'         => User::withoutGlobalScopes()->count(),
                'total_volunteers'    => User::withoutGlobalScopes()->where('role', 'Volunteer')->count(),
                'total_coordinators'  => User::withoutGlobalScopes()->where('role', 'Coordinator')->count(),
            ],
        ]);
    }

    /**
     * List all registered tenant organizations (paginated).
     */
    public function listOrganizations()
    {
        $organizations = Organization::latest()->paginate(config('vms.per_page', 15));

        return response()->json([
            'status'     => 'success',
            'data'       => OrganizationResource::collection($organizations->items()),
            'pagination' => [
                'current_page' => $organizations->currentPage(),
                'last_page'    => $organizations->lastPage(),
                'per_page'     => $organizations->perPage(),
                'total'        => $organizations->total(),
            ],
        ]);
    }

    /**
     * Get single organization details.
     */
    public function showOrganization($id)
    {
        $organization = Organization::withCount(['users', 'events'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'organization' => new OrganizationResource($organization),
                'user_count'   => $organization->users_count,
                'event_count'  => $organization->events_count,
            ],
        ]);
    }

    /**
     * Update tenant status (active, suspended, inactive) or subscription plan.
     */
    public function updateOrganizationStatus(Request $request, $id)
    {
        $request->validate([
            'status'            => 'sometimes|in:active,suspended,inactive',
            'subscription_plan' => 'sometimes|string|max:50',
        ]);

        $organization = Organization::findOrFail($id);
        $oldData      = $organization->only(['status', 'subscription_plan']);

        $organization->update($request->only(['status', 'subscription_plan']));

        $this->audit->log(
            'tenant.status_updated',
            $organization,
            $oldData,
            $organization->fresh()->only(['status', 'subscription_plan'])
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Organization status updated successfully.',
            'data'    => new OrganizationResource($organization->fresh()),
        ]);
    }
}
