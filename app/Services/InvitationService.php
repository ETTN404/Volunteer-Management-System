<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Staff invitations: no admin ever types a password.
 *
 * 1. A random temporary password is generated and emailed with a one-time link.
 * 2. The link (valid `vms.invitation_hours`) lets the person set their own password
 *    and is burned on first use.
 * 3. Signing in with the temporary password works too, but the account is flagged
 *    `must_change_password`, so the app shows the change-password screen first.
 * 4. Resending replaces both the password and the link.
 */
class InvitationService
{
    public function __construct(private FrontendUrl $frontend) {}

    /** @return array{invite_url: string, email_sent: bool, expires_at: string} */
    public function issue(User $user, ?User $inviter = null): array
    {
        $tempPassword = $this->temporaryPassword();
        $token        = Str::random(48);

        $user->forceFill([
            'password'             => Hash::make($tempPassword),
            'must_change_password' => true,
        ])->save();

        Invitation::where('user_id', $user->id)->whereNull('used_at')->update(['used_at' => now()]);

        $invitation = Invitation::create([
            'user_id'    => $user->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHours(config('vms.invitation_hours', 72)),
            'created_by' => $inviter?->id,
        ]);

        $url  = $this->frontend->to('/invite/' . $token);
        $sent = $this->mail($user, $url, $tempPassword, $invitation->expires_at->toDayDateTimeString() . ' UTC');

        return [
            'invite_url' => $url,
            'email_sent' => $sent,
            'expires_at' => $invitation->expires_at->toIso8601String(),
        ];
    }

    public function find(string $token): ?Invitation
    {
        return Invitation::with('user.organization')->where('token_hash', hash('sha256', $token))->first();
    }

    private function temporaryPassword(): string
    {
        // Unambiguous characters, 12 long, always mixes letters and digits.
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        do {
            $pw = '';
            for ($i = 0; $i < 12; $i++) {
                $pw .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        } while (!preg_match('/\d/', $pw) || !preg_match('/[A-Za-z]/', $pw));
        return $pw;
    }

    private function mail(User $user, string $url, string $password, string $expires): bool
    {
        try {
            $org = $user->organization?->name ?? 'VolunTrack';
            $user->notify(new class($org, $url, $password, $expires, $user->role) extends Notification {
                public function __construct(private string $org, private string $url, private string $password, private string $expires, private string $role) {}

                public function via($notifiable): array
                {
                    return ['mail'];
                }

                public function toMail($notifiable): MailMessage
                {
                    $role = ['OrgAdmin' => 'organization admin', 'Coordinator' => 'coordinator'][$this->role] ?? 'member';
                    return (new MailMessage)
                        ->subject("You're invited to {$this->org} on VolunTrack")
                        ->greeting('Hello ' . ($notifiable->first_name ?: $notifiable->full_name) . ',')
                        ->line("You've been added to {$this->org} as {$role}.")
                        ->action('Accept invitation', $this->url)
                        ->line('The link works once and expires ' . $this->expires . '.')
                        ->line('You can also sign in with this temporary password: ' . $this->password)
                        ->line('You will be asked to choose your own password the first time you sign in.');
                }
            });
            return true;
        } catch (\Throwable $e) {
            Log::warning('Invitation email failed: ' . $e->getMessage(), ['user_id' => $user->id]);
            return false;
        }
    }
}
