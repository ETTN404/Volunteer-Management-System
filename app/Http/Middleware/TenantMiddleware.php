<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    /**
     * Account & organization gate, on every API request.
     *
     * This middleware is global, so it runs BEFORE the route's `auth:sanctum`.
     * The default (web/session) guard knows nothing about bearer tokens, which is
     * why the old check never fired. We resolve the user through the sanctum
     * guard explicitly.
     *
     *  - Deactivated account                → 403 for everyone.
     *  - Organization suspended / inactive  → 403 for its staff (OrgAdmin, Coordinator).
     *    Volunteers are not owned by one organization: they keep their account,
     *    and the organization's events simply disappear from the marketplace.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->bearerToken() && !Auth::check()) {
            return $next($request);
        }

        $user = Auth::guard('sanctum')->user() ?? Auth::user();
        if (!$user) {
            return $next($request);
        }

        if ($user->is_active === false) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'account_inactive',
                'message' => 'Your account has been deactivated. Contact your organization administrator.',
            ], 403);
        }

        if (in_array($user->role, ['OrgAdmin', 'Coordinator'], true) && ($blocked = $user->organizationBlocked())) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'organization_' . $blocked,
                'error'   => $blocked === 'suspended' ? 'Organization Suspended' : 'Organization Inactive',
                'message' => $blocked === 'suspended'
                    ? 'Your organization account has been suspended. Please contact the platform administrator.'
                    : 'Your organization is inactive on VolunTrack. Contact the platform administrator to reactivate it.',
            ], 403);
        }

        return $next($request);
    }
}
