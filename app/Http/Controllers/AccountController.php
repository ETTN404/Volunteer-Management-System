<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Services\FileStore;

/** Signed-in user's own account: profile basics, password, photo, notifications. */
class AccountController extends Controller
{
    public function me(Request $request)
    {
        return new UserResource($request->user()->load('volunteer', 'organization'));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:60',
            'last_name'  => 'sometimes|string|max:60',
            'phone'      => ['sometimes', 'nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
        ]);
        $request->user()->update($data);

        return response()->json(['status' => 'success', 'data' => new UserResource($request->user()->fresh()->load('volunteer', 'organization'))]);
    }

    /** G4 — change password. Also completes the forced change after an invitation. */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|max:100|confirmed|different:current_password',
        ]);
        $user = $request->user();

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'The password is incorrect.', 'errors' => ['current_password' => ['The password is incorrect.']]], 422);
        }

        $user->forceFill([
            'password'             => Hash::make($data['password']),
            'must_change_password' => false,
            'email_verified_at'    => $user->email_verified_at ?? now(),
        ])->save();

        // Sign out every other device.
        $current = $user->currentAccessToken();
        $user->tokens()->when($current && isset($current->id), fn ($q) => $q->where('id', '!=', $current->id))->delete();

        return response()->json(['status' => 'success', 'message' => 'Password changed. Other devices were signed out.']);
    }

    /** G28 — profile photo. */
    public function uploadPhoto(Request $request)
    {
        $request->validate(['photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048']);
        $user = $request->user();

        $files = app(FileStore::class);
        $path  = $files->put($request->file('photo'), 'public');
        $files->delete($user->profile_photo_path);
        $user->update(['profile_photo_path' => $path]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Photo updated.',
            'data'    => ['profile_photo_url' => $files->url($path)],
        ]);
    }

    public function deletePhoto(Request $request)
    {
        $user = $request->user();
        if ($user->profile_photo_path) {
            app(FileStore::class)->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
        }
        return response()->json(['status' => 'success', 'data' => ['profile_photo_url' => null]]);
    }

    // ------------------------------------------------------------------
    // G25 — notifications
    // ------------------------------------------------------------------

    public function notifications(Request $request)
    {
        $user  = $request->user();
        $items = $user->notifications()->latest()->limit(50)->get();

        return response()->json([
            'status'       => 'success',
            'data'         => $items->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->data['type'] ?? class_basename($n->type),
                'title'      => $n->data['title'] ?? ($n->data['message'] ?? 'Update'),
                'body'       => $n->data['body'] ?? ($n->data['message'] ?? ''),
                'action_url' => $n->data['action_url'] ?? null,
                'data'       => $n->data,
                'read_at'    => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->toIso8601String(),
            ])->values(),
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markNotificationRead(Request $request, string $id)
    {
        $request->user()->notifications()->where('id', $id)->update(['read_at' => now()]);
        return response()->json(['status' => 'success']);
    }

    public function markAllNotificationsRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);
        return response()->json(['status' => 'success']);
    }
}
