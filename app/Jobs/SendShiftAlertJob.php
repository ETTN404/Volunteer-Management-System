<?php

namespace App\Jobs;

use App\Models\Announcement;
use App\Models\Shift;
use App\Models\Volunteer;
use App\Notifications\ShiftBroadcastNotification;
use App\Services\SkillMatchingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queued Job for Urgent Shift Broadcast Alerts
 * Offloads skill-matching calculations and volunteer notification dispatching
 * to a background worker to maintain low API response latency (< 50ms).
 */
class SendShiftAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $shiftId,
        public int $orgId,
        public int $postedById
    ) {}

    /**
     * Execute the job.
     */
    public function handle(SkillMatchingService $skillMatcher): void
    {
        $shift = Shift::with('event')->findOrFail($this->shiftId);
        $event = $shift->event;
        $requiredSkills = $shift->required_skills ?? [];

        // Fetch all volunteers belonging to this organization
        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', $this->orgId)
            ->select('volunteers.*')
            ->get();

        $notifiedCount = 0;

        foreach ($volunteers as $vol) {
            $score = $skillMatcher->calculateMatchScore($vol->skills ?? [], $requiredSkills);

            // Notify if score > 0 (or if shift has no required skills, score is 100)
            if ($score > 0) {
                if ($vol->user) {
                    $vol->user->notify(new ShiftBroadcastNotification($shift));
                }
                Log::info("SendShiftAlertJob: Shift alert dispatched to volunteer #{$vol->id} (Match Score: {$score}%) for event '{$event->title}'.");
                $notifiedCount++;
            }
        }

        // Save organization-wide urgent announcement record
        Announcement::create([
            'org_id'          => $this->orgId,
            'posted_by'       => $this->postedById,
            'title'           => '🚨 URGENT: Coverage Needed for ' . $event->title,
            'message'         => 'We urgently require qualified volunteer coverage for an upcoming shift on ' . $shift->start_time . '. Required Skills: ' . (empty($requiredSkills) ? 'None' : implode(', ', $requiredSkills)) . '.',
            'target_audience' => 'volunteers',
        ]);

        Log::info("SendShiftAlertJob: Completed alert broadcast for shift #{$this->shiftId}. Total volunteers notified: {$notifiedCount}.");
    }
}
