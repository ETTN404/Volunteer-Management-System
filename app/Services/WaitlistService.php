<?php

namespace App\Services;

use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Notifications\AppNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * When a full shift gets a free place (someone withdraws, is removed or declined,
 * or capacity goes up) the first person on the waitlist takes it automatically.
 * Too close to the start (under an hour) nobody is moved — the coordinator is told instead.
 */
class WaitlistService
{
    public const MIN_LEAD_MINUTES = 60;

    public function __construct(private Notifier $notifier) {}

    /** Position (1-based) of a waitlisted assignment. */
    public function position(ShiftAssignment $a): ?int
    {
        if ($a->status !== 'waitlisted') {
            return null;
        }
        return ShiftAssignment::where('shift_id', $a->shift_id)->where('status', 'waitlisted')
            ->where(fn ($q) => $q->where('waitlisted_at', '<', $a->waitlisted_at)
                ->orWhere(fn ($q) => $q->where('waitlisted_at', $a->waitlisted_at)->where('id', '<', $a->id)))
            ->count() + 1;
    }

    /** @return int number of volunteers promoted */
    public function fill(Shift $shift): int
    {
        $shift->loadMissing('event');
        if (!$shift->event || in_array($shift->event->status, ['completed', 'cancelled'], true)) {
            return 0;
        }

        $promoted = [];
        DB::transaction(function () use ($shift, &$promoted) {
            $open = $shift->capacity - $shift->confirmedCount();
            if ($open <= 0) {
                return;
            }
            $tooLate = $shift->start_time->lt(now()->addMinutes(self::MIN_LEAD_MINUTES));

            $queue = ShiftAssignment::where('shift_id', $shift->id)->where('status', 'waitlisted')
                ->orderBy('waitlisted_at')->orderBy('id')->with('volunteer.user')->lockForUpdate()->get();
            if ($queue->isEmpty()) {
                return;
            }
            if ($tooLate) {
                $this->notifier->send($this->notifier->staffOf($shift->event->org_id), new AppNotification(
                    'waitlist_waiting',
                    "{$open} open place(s) on {$shift->event->title}",
                    "{$queue->count()} volunteer(s) are on the waitlist, but the shift starts within an hour — add someone by hand from the roster.",
                    '/c/live/' . $shift->id,
                ));
                return;
            }

            foreach ($queue as $a) {
                if ($open <= 0) {
                    break;
                }
                $v = $a->volunteer;
                if (!$v || !$v->user || $v->user->is_active === false || ($v->isMinor() && !$v->parental_consent_verified)) {
                    continue;
                }
                $clash = ShiftAssignment::join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
                    ->where('shift_assignments.volunteer_id', $v->id)
                    ->where('shift_assignments.status', 'confirmed')
                    ->whereNull('shifts.deleted_at')
                    ->where('shifts.id', '!=', $shift->id)
                    ->where('shifts.start_time', '<', $shift->end_time)
                    ->where('shifts.end_time', '>', $shift->start_time)
                    ->exists();
                if ($clash) {
                    continue;
                }
                $a->update(['status' => 'confirmed', 'assigned_at' => now(), 'staff_notes' => 'Moved up from the waitlist']);
                $promoted[] = $a;
                $open--;
            }
        });

        foreach ($promoted as $a) {
            Cache::forget("volunteer_{$a->volunteer_id}_schedule");
            $this->notifier->send($a->volunteer->user, new AppNotification(
                'waitlist_promoted',
                "You're in: {$shift->event->title}",
                'A place opened up and you moved up from the waitlist. Shift: ' . $shift->start_time->toDayDateTimeString() . ' UTC. Can\'t make it? Withdraw in the app so the next person gets it.',
                '/v/schedule',
                ['shift_id' => $shift->id],
            ));
        }
        if ($promoted) {
            Cache::forget("shift_{$shift->id}_capacity");
            $this->notifier->send($this->notifier->staffOf($shift->event->org_id), new AppNotification(
                'waitlist_filled',
                count($promoted) . ' volunteer(s) moved up from the waitlist',
                collect($promoted)->map(fn ($a) => $a->volunteer->user->full_name)->implode(', ') . " — {$shift->event->title}.",
                '/c/live/' . $shift->id,
            ));
        }

        return count($promoted);
    }
}
