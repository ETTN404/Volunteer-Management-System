<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new volunteer.
     */
    public function register(Request $request)
    {
        $request->validate([
            'org_id' => 'nullable|exists:organizations,id',
            'full_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:8',
            'skills' => 'nullable|array',
            'availability' => 'nullable|array',
            'bio' => 'nullable|string',
        ]);

        // Create User
        $user = User::create([
            'org_id' => $request->org_id, // can be null for global volunteers
            'full_name' => $request->full_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'Volunteer',
        ]);

        // Create Volunteer profile (without TenantScope during creation to avoid missing org_id issues)
        $volunteer = Volunteer::create([
            'user_id' => $user->id,
            'skills' => $request->skills ?? [],
            'availability' => $request->availability ?? [],
            'total_hours' => 0.00,
            'impact_score' => 0.00,
            'bio' => $request->bio,
        ]);

        // Generate token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Volunteer registered successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('volunteer'),
        ], 201);
    }

    /**
     * Authenticate and login users of any role.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // Update last login
        $user->update([
            'last_login' => now(),
        ]);

        // Generate token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'role' => $user->role,
            'user' => $user->load('volunteer'),
        ]);
    }

    /**
     * Securely logout and revoke active session token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Session logged out successfully.'
        ]);
    }
}
