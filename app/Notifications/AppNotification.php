<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * General in-app notification (bell + optional email).
 * `type` drives the icon in the UI; `action_url` is a frontend path.
 */
class AppNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $type,
        public string $title,
        public string $body,
        public ?string $actionUrl = null,
        public array $extra = [],
        public bool $mail = false,
    ) {}

    public function via(object $notifiable): array
    {
        return ($this->mail || config('vms.notify_mail')) ? ['database', 'mail'] : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title)
            ->greeting('Hello ' . ($notifiable->first_name ?: $notifiable->full_name) . ',')
            ->line($this->body);

        if ($this->actionUrl && ($base = app(\App\Services\FrontendUrl::class)->base())) {
            $mail->action('Open VolunTrack', $base . $this->actionUrl);
        }

        return $mail;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'       => $this->type,
            'title'      => $this->title,
            'body'       => $this->body,
            'action_url' => $this->actionUrl,
        ] + $this->extra;
    }
}
