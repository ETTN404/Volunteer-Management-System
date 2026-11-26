<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Sends notifications without ever breaking or slowing the request.
 *
 * The in-app (bell) notification is written immediately. Everything that talks
 * to another server — email, Telegram, SMS — runs *after* the response has been
 * sent (Laravel `defer`). A slow or blocked mail server (Render's free tier blocks
 * SMTP) used to keep requests open until the browser gave up, so the UI showed
 * "failed" although the change had been saved.
 */
class Notifier
{
    /** @param iterable<User>|User $users */
    public function send(iterable|User $users, Notification $notification): int
    {
        $users = $users instanceof User ? [$users] : $users;
        $sent  = 0;
        $later = [];
        foreach ($users as $user) {
            try {
                $channels = $notification->via($user);
                if (in_array('database', $channels, true)) {
                    $user->notifyNow($notification, ['database']);
                }
                $sent++;
                $later[] = [$user, array_values(array_diff($channels, ['database']))];
            } catch (\Throwable $e) {
                Log::warning('Notification failed: ' . $e->getMessage(), ['user_id' => $user->id, 'type' => get_class($notification)]);
            }
        }

        if ($later) {
            self::afterResponse(function () use ($later, $notification) {
                foreach ($later as [$user, $channels]) {
                    try {
                        if ($channels) {
                            $user->notifyNow($notification, $channels);
                        }
                        if (method_exists($notification, 'toArray')) {
                            app(AlertChannels::class)->deliver($user, $notification->toArray($user));
                        }
                    } catch (\Throwable $e) {
                        Log::warning('Notification delivery failed: ' . $e->getMessage(), ['user_id' => $user->id, 'type' => get_class($notification)]);
                    }
                }
            });
        }

        return $sent;
    }

    /** Run slow outside-world work after the HTTP response is sent (immediately in console/queue). */
    public static function afterResponse(callable $work): void
    {
        if (app()->runningInConsole() && !app()->runningUnitTests()) {
            $work();
            return;
        }
        \Illuminate\Support\defer(function () use ($work) {
            ignore_user_abort(true);
            @set_time_limit(120);
            $work();
        });
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
