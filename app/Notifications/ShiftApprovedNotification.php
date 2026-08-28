<?php

namespace App\Notifications;

use App\Models\Shift;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShiftApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Shift $shift) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $event = $this->shift->event;

        return (new MailMessage)
            ->subject('🎉 Shift Application Approved: ' . $event->title)
            ->greeting('Hello ' . $notifiable->full_name . '!')
            ->line('Great news! Your shift application for "' . $event->title . '" has been approved by the coordinator.')
            ->line('Shift Start Time: ' . $this->shift->start_time)
            ->line('Location: ' . $event->location)
            ->line('Please arrive 15 minutes before your shift start time to check in using the QR code.')
            ->action('View My Schedule', url('/volunteer/schedule'))
            ->line('Thank you for volunteering with us!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'        => 'shift_approved',
            'shift_id'    => $this->shift->id,
            'event_title' => $this->shift->event->title,
            'start_time'  => $this->shift->start_time,
            'message'     => 'Your application for shift #' . $this->shift->id . ' has been approved.',
        ];
    }
}
