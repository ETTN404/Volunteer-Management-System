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
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            // If the user belongs to an organization, check if the organization is active
            if ($user->org_id !== null && $user->relationLoaded('organization')) {
                $org = $user->organization;
                if ($org && $org->status === 'suspended') {
                    Auth::logout();
                    return response()->json(['error' => 'Your organization has been suspended.'], 403);
                }
            }
        }

        return $next($request);
    }
}
