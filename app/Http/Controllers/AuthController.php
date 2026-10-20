<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterVolunteerRequest;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\FrontendUrl;
use App\Services\InvitationService;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private InvitationService $invitations, private FrontendUrl $frontend) {}

    public function register(RegisterVolunteerRequest $request)
    {
        if ($request->org_id && !Organization::query()->public()->whereKey($request->org_id)->exists()) {
            throw ValidationException::withMessages(['org_id' => ['This organization is not accepting volunteers.']]);
        }

        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'org_id'     => $request->org_id,
                'first_name' => $request->first_name ? trim($request->first_name) : null,
                'last_name'  => $request->last_name ? trim($request->last_name) : null,
                'full_name'  => trim($request->full_name ?? ($request->first_name . ' ' . $request->last_name)),
                'email'      => strtolower(trim($request->email)),
                'phone'      => $request->phone,
                'password'   => Hash::make($request->password),
                'role'       => 'Volunteer',
            ]);

            Volunteer::create([
                'user_id'       => $user->id,
                'skills'        => $request->skills ?? [],
                'availability'  => $request->availability ?? [],
                'total_hours'   => 0.00,
                'impact_score'  => 0.00,
                'bio'           => $request->bio,
                'date_of_birth' => $request->date_of_birth,
            ]);

            return $user;
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Volunteer registered successfully.',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => new UserResource($user->load('volunteer', 'organization')),
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        // Self-heal: a freshly deployed container with an empty database seeds the demo accounts.
        try {
            if (User::withoutGlobalScopes()->count() === 0) {
                \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
                \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
            }
        } catch (\Throwable $e) {
            // ignore — migrations may already be running
        }

        $loginInput = trim($request->input('email'));
        $user = User::withoutGlobalScopes()
            ->where('email', strtolower($loginInput))
            ->orWhere('email', $loginInput)
            ->orWhere('full_name', $loginInput)
            ->first();

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials. Please check your email/username and password.'],
            ]);
        }

        if ($user->is_active === false) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'account_inactive',
                'message' => 'Your account has been deactivated. Contact your organization administrator.',
            ], 403);
        }

        if ($blocked = $user->organizationBlocked()) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'organization_' . $blocked,
                'error'   => $blocked === 'suspended' ? 'Organization Suspended' : 'Organization Inactive',
                'message' => $blocked === 'suspended'
                    ? 'Your organization account has been suspended. Please contact the platform administrator.'
                    : 'Your organization is inactive on VolunTrack. Contact the platform administrator to reactivate it.',
            ], 403);
        }

        $user->update(['last_login' => now()]);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'               => 'success',
            'message'              => 'Login successful.',
            'access_token'         => $token,
            'token_type'           => 'Bearer',
            'role'                 => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
            'user'                 => new UserResource($user->load('volunteer', 'organization')),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['status' => 'success', 'message' => 'Session logged out successfully.']);
    }

    // ------------------------------------------------------------------
    // G3 — forgot / reset password (public)
    // ------------------------------------------------------------------

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::withoutGlobalScopes()->where('email', strtolower(trim($request->email)))->first();

        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );
            $url = $this->frontend->to('/reset-password/' . $token . '?email=' . urlencode($user->email));
            try {
                $user->notify(new class($url) extends Notification {
                    public function __construct(private string $url) {}
                    public function via($n): array { return ['mail']; }
                    public function toMail($n): MailMessage
                    {
                        return (new MailMessage)->subject('Reset your VolunTrack password')
                            ->line('Someone asked to reset the password for this account.')
                            ->action('Choose a new password', $this->url)
                            ->line('The link expires in 60 minutes. If it was not you, ignore this email.');
                    }
                });
            } catch (\Throwable $e) {
                Log::warning('Reset email failed: ' . $e->getMessage());
            }
        }

        // Never reveal whether the email exists.
        return response()->json(['status' => 'success', 'message' => 'If that email has an account, a reset link is on its way.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => 'required|string|min:8|max:100|confirmed',
        ]);

        $row = DB::table('password_reset_tokens')->where('email', strtolower($data['email']))->first();
        if (!$row || !Hash::check($data['token'], $row->token) || now()->subMinutes(60)->gt($row->created_at)) {
            return response()->json(['message' => 'This password reset token is invalid.', 'errors' => ['token' => ['This password reset token is invalid.']]], 422);
        }

        $user = User::withoutGlobalScopes()->where('email', strtolower($data['email']))->firstOrFail();
        $user->forceFill(['password' => Hash::make($data['password']), 'must_change_password' => false])->save();
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();

        return response()->json(['status' => 'success', 'message' => 'Password updated. Sign in with your new password.']);
    }

    // ------------------------------------------------------------------
    // Invitations (public)
    // ------------------------------------------------------------------

    public function showInvitation(string $token)
    {
        $invitation = $this->invitations->find($token);
        if (!$invitation || !$invitation->user) {
            return response()->json(['status' => 'error', 'code' => 'invitation_invalid', 'message' => 'This invitation link is not valid.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'email'        => $invitation->user->email,
                'first_name'   => $invitation->user->first_name,
                'full_name'    => $invitation->user->full_name,
                'role'         => $invitation->user->role,
                'organization' => $invitation->user->organization?->name,
                'expires_at'   => $invitation->expires_at->toIso8601String(),
                'usable'       => $invitation->isUsable(),
                'reason'       => $invitation->used_at ? 'used' : ($invitation->expires_at->isPast() ? 'expired' : null),
            ],
        ]);
    }

    public function acceptInvitation(Request $request, string $token)
    {
        $data = $request->validate(['password' => 'required|string|min:8|max:100|confirmed']);
        $invitation = $this->invitations->find($token);

        if (!$invitation || !$invitation->user || !$invitation->isUsable()) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'invitation_expired',
                'message' => 'This invitation has expired or was already used. Ask for a new one below.',
            ], 410);
        }

        $user = $invitation->user;
        DB::transaction(function () use ($user, $invitation, $data) {
            $user->forceFill([
                'password'             => Hash::make($data['password']),
                'must_change_password' => false,
                'email_verified_at'    => $user->email_verified_at ?? now(),
            ])->save();
            $invitation->update(['used_at' => now()]);
        });

        $tokenStr = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'       => 'success',
            'message'      => 'Welcome to VolunTrack!',
            'access_token' => $tokenStr,
            'token_type'   => 'Bearer',
            'role'         => $user->role,
            'user'         => new UserResource($user->load('organization')),
        ]);
    }

    /** Self-service resend for an invited person whose link expired. Always 200. */
    public function resendInvitation(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::withoutGlobalScopes()->where('email', strtolower(trim($request->email)))->first();

        if ($user && $user->must_change_password && $user->role !== 'Volunteer') {
            $recent = \App\Models\Invitation::where('user_id', $user->id)->where('created_at', '>', now()->subMinutes(2))->exists();
            if (!$recent) {
                $this->invitations->issue($user);
            }
        }

        return response()->json(['status' => 'success', 'message' => 'If an invitation is waiting for that email, a fresh link has been sent.']);
    }
}
