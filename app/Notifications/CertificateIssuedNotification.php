<?php

namespace App\Notifications;

use App\Models\Certificate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CertificateIssuedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Certificate $certificate) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('📜 Certificate of Appreciation Earned!')
            ->greeting('Congratulations ' . $notifiable->full_name . '!')
            ->line('In recognition of your outstanding service, you have officially earned a Certificate of Appreciation!')
            ->line('Milestone Hours Reached: ' . $this->certificate->milestone_hours . ' Hours')
            ->line('Issued Date: ' . $this->certificate->issued_date)
            ->action('Download Certificate', url($this->certificate->file_path))
            ->line('Thank you for your dedicated community service and impact!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'            => 'certificate_issued',
            'certificate_id'  => $this->certificate->id,
            'milestone_hours' => $this->certificate->milestone_hours,
            'download_url'    => url($this->certificate->file_path),
            'message'         => 'Congratulations! You earned a ' . $this->certificate->milestone_hours . '-hour certificate of appreciation.',
        ];
    }
}
