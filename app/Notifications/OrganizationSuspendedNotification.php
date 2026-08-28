<?php

namespace App\Notifications;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrganizationSuspendedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Organization $organization) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->error()
            ->subject('⚠️ Notice: Organization Account Suspended')
            ->greeting('Attention ' . $notifiable->full_name . ',')
            ->line('Your organization account "' . $this->organization->name . '" has been suspended by the platform administrator.')
            ->line('During suspension, staff and volunteers will not be able to log in or access platform services.')
            ->line('If you believe this is an error or wish to request reactivation, please contact support.')
            ->action('Contact Support', url('mailto:support@voluntrackapp.com'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'            => 'org_suspended',
            'organization_id' => $this->organization->id,
            'message'         => 'Your organization account has been suspended.',
        ];
    }
}
