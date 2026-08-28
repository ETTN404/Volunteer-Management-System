<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterVolunteerRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new volunteer.
     */
    public function register(RegisterVolunteerRequest $request)
    {
        $user = User::create([
            'org_id'    => $request->org_id,
            'full_name' => $request->full_name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'Volunteer',
        ]);

        Volunteer::create([
            'user_id'      => $user->id,
            'skills'       => $request->skills ?? [],
            'availability' => $request->availability ?? [],
            'total_hours'  => 0.00,
            'impact_score' => 0.00,
            'bio'          => $request->bio,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Volunteer registered successfully.',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => new UserResource($user->load('volunteer')),
        ], 201);
    }

    /**
     * Authenticate and login users of any role.
     */
    public function login(LoginRequest $request)
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['last_login' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Login successful.',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'role'         => $user->role,
            'user'         => new UserResource($user->load('volunteer')),
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
