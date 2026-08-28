<?php

namespace App\Notifications;

use App\Models\Shift;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShiftBroadcastNotification extends Notification implements ShouldQueue
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
        $skills = empty($this->shift->required_skills)
            ? 'None'
            : implode(', ', $this->shift->required_skills);

        return (new MailMessage)
            ->subject('🚨 URGENT: Coverage Needed for ' . $event->title)
            ->greeting('Hello ' . $notifiable->full_name . '!')
            ->line('We urgently require qualified volunteer coverage for an upcoming shift.')
            ->line('Event: ' . $event->title)
            ->line('Shift Start: ' . $this->shift->start_time)
            ->line('Location: ' . $event->location)
            ->line('Required Skills: ' . $skills)
            ->action('Apply Now', url('/volunteer/events'))
            ->line('If you are available, please log in and apply immediately to secure your slot!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'        => 'urgent_shift_broadcast',
            'shift_id'    => $this->shift->id,
            'event_title' => $this->shift->event->title,
            'start_time'  => $this->shift->start_time,
            'message'     => 'Urgent shift coverage needed for ' . $this->shift->event->title . '.',
        ];
    }
}
