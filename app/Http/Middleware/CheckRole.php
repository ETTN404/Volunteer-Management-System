<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!Auth::check()) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        $user = Auth::user();

        // Check if user's role is in the list of allowed roles
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'error' => 'Unauthorized.',
                'message' => 'Action requires one of the following roles: ' . implode(', ', $roles)
            ], 403);
        }

        return $next($request);
    }
}
