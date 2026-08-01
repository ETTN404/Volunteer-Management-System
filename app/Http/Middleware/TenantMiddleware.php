<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Runs on every authenticated API request to verify the user's organization
     * is still active. This is the primary suspension enforcement gate for the
     * multi-tenant architecture.
     *
     * IMPORTANT: We always query the organization directly from the database.
     * We never rely on $user->relationLoaded('organization') because on fresh
     * API requests that relationship is almost never pre-loaded, which would
     * silently bypass this entire security check.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();

            // SuperAdmin has no org_id — they are platform-level, skip the check
            if ($user->org_id !== null) {
                // Always query fresh from DB — never assume the relation is cached
                $org = $user->organization()->first();

                if ($org && $org->status === 'suspended') {
                    // Revoke all existing Sanctum tokens so cached tokens also stop working
                    $user->tokens()->delete();

                    return response()->json([
                        'error'   => 'Organization Suspended',
                        'message' => 'Your organization account has been suspended. Please contact the platform administrator.',
                    ], 403);
                }
            }
        }

        return $next($request);
    }
}

