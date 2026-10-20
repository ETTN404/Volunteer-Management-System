<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Sends notifications without ever breaking the request: a failing mail
 * server must not stop a check-out, an approval or an announcement.
 */
class Notifier
{
    /** @param iterable<User>|User $users */
    public function send(iterable|User $users, Notification $notification): int
    {
        $users = $users instanceof User ? [$users] : $users;
        $sent  = 0;
        foreach ($users as $user) {
            try {
                $user->notify($notification);
                $sent++;
            } catch (\Throwable $e) {
                Log::warning('Notification failed: ' . $e->getMessage(), ['user_id' => $user->id, 'type' => get_class($notification)]);
            }
        }
        return $sent;
    }

    /** Staff (coordinators + org admins) of an organization. */
    public function staffOf(int $orgId)
    {
        return User::withoutGlobalScopes()->where('org_id', $orgId)
            ->whereIn('role', ['Coordinator', 'OrgAdmin'])->where('is_active', true)->get();
    }

    public function superAdmins()
    {
        return User::withoutGlobalScopes()->where('role', 'SuperAdmin')->where('is_active', true)->get();
    }

    public function orgAdmins(int $orgId)
    {
        return User::withoutGlobalScopes()->where('org_id', $orgId)->where('role', 'OrgAdmin')->get();
    }
}
