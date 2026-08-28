<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureVolunteerProfile
{
    /**
     * Handle an incoming request.
     * Ensures that the authenticated user has an associated Volunteer profile.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (!$user || !$user->volunteer) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Forbidden: A valid volunteer profile is required to access this resource.'
            ], 403);
        }

        return $next($request);
    }
}
