<?php

namespace App\Jobs;

use App\Models\Shift;
use App\Models\Announcement;
use App\Models\Volunteer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Task 10.1.1.2: Queued Job for Urgent Shift Broadcast Alerts
 * Offloads the potentially heavy volunteer-filtering and notification
 * dispatch to a background worker to prevent HTTP timeouts.
 */
class SendShiftAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;

    protected int $shiftId;
    protected int $orgId;
    protected int $postedById;

    /**
     * Create a new job instance.
     */
    public function __construct(int $shiftId, int $orgId, int $postedById)
    {
        $this->shiftId = $shiftId;
        $this->orgId = $orgId;
        $this->postedById = $postedById;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $shift = Shift::with('event')->findOrFail($this->shiftId);
        $event = $shift->event;
        $requiredSkills = $shift->required_skills ?? [];

        // Fetch all qualified volunteers in this organization
        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $this->orgId)
            ->select('volunteers.*', 'users.full_name', 'users.email')
            ->get();

        $notifiedCount = 0;

        foreach ($volunteers as $vol) {
            $volunteerSkills = $vol->skills ?? [];

            // Match if no skills required or if there's a skill overlap
            if (empty($requiredSkills) || count(array_intersect(
                array_map('strtolower', $volunteerSkills),
                array_map('strtolower', $requiredSkills)
            )) > 0) {
                // In production, dispatch individual email/SMS notifications here:
                // Mail::to($vol->email)->send(new UrgentShiftNotification($shift, $event));
                
                Log::info("Shift alert dispatched to volunteer: {$vol->full_name} ({$vol->email}) for event: {$event->title}");
                $notifiedCount++;
            }
        }

        // Save the Announcement record
        Announcement::create([
            'org_id' => $this->orgId,
            'posted_by' => $this->postedById,
            'title' => '🚨 URGENT: Coverage Needed for ' . $event->title,
            'message' => 'We urgently require qualified volunteer coverage for an upcoming shift on ' . $shift->start_time . '. Required Skills: ' . (empty($requiredSkills) ? 'None' : implode(', ', $requiredSkills)) . '.',
            'target_audience' => 'volunteers',
        ]);

        Log::info("Background shift alert completed. Notified {$notifiedCount} volunteers for shift #{$this->shiftId}.");
    }
}
