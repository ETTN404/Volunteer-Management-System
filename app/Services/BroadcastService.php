<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use App\Notifications\ShiftBroadcastNotification;
use Illuminate\Support\Collection;

/**
 * Urgent shift alerts and announcement delivery.
 *
 * Audience for an urgent alert (BR-07):
 *   - volunteers registered under the organization, volunteers who ever applied
 *     to it, and independent volunteers (no home organization)
 *   - active accounts only, not already on this shift, free at that time
 *   - skill match > 0 (every volunteer matches a shift with no required skills)
 */
class BroadcastService
{
    public function __construct(private SkillMatchingService $matcher, private Notifier $notifier) {}

    /** @return Collection<int, Volunteer> sorted by match score */
    public function recipients(Shift $shift, int $max = 500): Collection
    {
        $orgId = $shift->event->org_id;

        $already = ShiftAssignment::where('shift_id', $shift->id)->whereIn('status', ['pending', 'confirmed'])->pluck('volunteer_id');
        $busy    = ShiftAssignment::where('status', 'confirmed')
            ->whereHas('shift', fn ($q) => $q->where('id', '!=', $shift->id)->where('start_time', '<', $shift->end_time)->where('end_time', '>', $shift->start_time))
            ->pluck('volunteer_id');

        $independent = User::withoutGlobalScopes()->whereNull('org_id')->where('role', 'Volunteer')->select('id');

        return Volunteer::query()
            ->where(fn ($q) => $q->engagedWith($orgId)->orWhereIn('volunteers.user_id', $independent))
            ->whereNotIn('volunteers.id', $already)
            ->whereNotIn('volunteers.id', $busy)
            ->with('user')
            ->limit($max * 2)
            ->get()
            ->filter(fn ($v) => $v->user && $v->user->is_active !== false)
            ->map(function ($v) use ($shift) {
                $v->setAttribute('match_score', $this->matcher->calculateMatchScore($v->skills ?? [], $shift->required_skills ?? []));
                return $v;
            })
            ->filter(fn ($v) => $v->match_score > 0)
            ->sortByDesc('match_score')
            ->take($max)
            ->values();
    }

    /** Send the alert; returns how many volunteers were notified. */
    public function broadcast(Shift $shift, int $postedBy): array
    {
        $recipients = $this->recipients($shift);
        $sent = $this->notifier->send($recipients->pluck('user'), new ShiftBroadcastNotification($shift));

        $skills = $shift->required_skills ?? [];
        $announcement = Announcement::withoutGlobalScopes()->create([
            'org_id'           => $shift->event->org_id,
            'posted_by'        => $postedBy,
            'title'            => 'Urgent: volunteers needed for ' . $shift->event->title,
            'message'          => 'A shift on ' . $shift->start_time->toDayDateTimeString() . ' UTC still needs people'
                . (empty($skills) ? '.' : ' with: ' . implode(', ', array_map(fn ($s) => str_replace('_', ' ', $s), $skills)) . '.')
                . ' Open the event to apply.',
            'target_audience'  => 'volunteers',
            'kind'             => 'urgent',
            'shift_id'         => $shift->id,
            'recipients_count' => $sent,
        ]);

        return ['notified' => $sent, 'announcement_id' => $announcement->id];
    }

    /**
     * Who should see an announcement: org members of the right role, plus
     * volunteers who applied to the organization's shifts.
     *
     * @return Collection<int, User>
     */
    public function announcementAudience(Announcement $a): Collection
    {
        $users = collect();
        if (in_array($a->target_audience, ['all', 'coordinators'], true)) {
            $users = $users->merge(User::withoutGlobalScopes()->where('org_id', $a->org_id)->whereIn('role', ['Coordinator', 'OrgAdmin'])->where('id', '!=', $a->posted_by)->get());
        }
        if (in_array($a->target_audience, ['all', 'volunteers'], true)) {
            $users = $users->merge(Volunteer::query()->engagedWith($a->org_id)->with('user')->get()->pluck('user')->filter());
        }
        return $users->filter(fn ($u) => $u->is_active !== false)->unique('id')->values();
    }
}
