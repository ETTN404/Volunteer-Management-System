<?php

namespace App\Services\VolunBot;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Scopes\TenantScope;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Volunteer;
use App\Models\VolunteerDocument;
use App\Services\SkillMatchingService;
use App\Services\WaitlistService;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Builds VolunBot's view of one volunteer, fresh from the database on every
 * message — so the assistant always answers from the latest profile, schedule,
 * hours and open shifts, even if something changed mid-conversation.
 *
 * Everything the model might be tempted to calculate (distance, fit, overlap,
 * time left) is computed here, so answers stay exact.
 */
class ContextBuilder
{
    public const TZ = 'Africa/Addis_Ababa';

    /** Shift ids the model may turn into cards, with their card payloads. */
    public array $cards = [];

    public function __construct(
        private SkillMatchingService $skills,
        private WaitlistService $waitlist,
    ) {}

    /** @param array{lat: float, lng: float, label?: string|null, source?: string}|null $location */
    public function build(Volunteer $volunteer, ?array $location): array
    {
        $this->cards = [];
        $user = $volunteer->user;
        $now = now();
        $mySkills = array_map('strtolower', $volunteer->skills ?? []);
        $availability = $this->availability($volunteer->availability);

        $assignments = ShiftAssignment::where('volunteer_id', $volunteer->id)
            ->whereHas('shift')
            ->with(['shift' => fn ($q) => $q->withoutGlobalScope(TenantScope::class), 'shift.event' => fn ($q) => $q->withoutGlobalScope(TenantScope::class), 'shift.event.organization'])
            ->get();
        $attendance = Attendance::where('volunteer_id', $volunteer->id)
            ->with(['shift' => fn ($q) => $q->withoutGlobalScope(TenantScope::class), 'shift.event' => fn ($q) => $q->withoutGlobalScope(TenantScope::class), 'shift.event.organization'])
            ->orderByDesc('check_in_time')->get();
        $attendanceByShift = $attendance->keyBy('shift_id');

        // ---- schedule -------------------------------------------------------
        $busy = [];
        $upcoming = [];
        foreach ($assignments as $a) {
            $s = $a->shift;
            if (!$s || !$s->event || $s->end_time->lt($now)) {
                continue;
            }
            if (in_array($a->status, ['pending', 'confirmed'], true)) {
                $busy[] = [$s->start_time, $s->end_time];
            }
            if (!in_array($a->status, ['pending', 'confirmed', 'waitlisted'], true)) {
                continue;
            }
            $att = $attendanceByShift[$s->id] ?? null;
            $row = $this->shiftRow($s, $location, $now) + [
                'my_status'      => $a->status === 'confirmed' ? 'confirmed' : ($a->status === 'pending' ? 'applied, waiting for coordinator' : 'waitlisted'),
                'waitlist_place' => $a->status === 'waitlisted' ? $this->waitlist->position($a) : null,
                'check_in'       => $this->checkInState($s, $att, $now),
            ];
            $upcoming[] = array_filter($row, fn ($v) => $v !== null);
            $this->card($s, $location, $now, $a->status);
        }
        usort($upcoming, fn ($x, $y) => strcmp($x['starts_iso'], $y['starts_iso']));

        // ---- history --------------------------------------------------------
        $recent = $attendance->filter(fn ($a) => $a->shift && $a->shift->event)->take(12)->map(fn ($a) => array_filter([
            'event'          => $a->shift->event->title,
            'shift'          => $a->shift->title,
            'organization'   => $a->shift->event->organization?->name,
            'date'           => $this->local($a->check_in_time)?->format('D j M Y'),
            'checked_in'     => $this->local($a->check_in_time)?->format('H:i'),
            'checked_out'    => $this->local($a->check_out_time)?->format('H:i') ?? 'still on shift',
            'hours'          => $a->check_out_time ? round((float) ($a->verified_hours ?? $a->rawHours()), 2) : null,
            'hours_status'   => $a->check_out_time ? ($a->hours_status ?? 'pending') : null,
            'coordinator_note' => $a->verification_note,
        ], fn ($v) => $v !== null && $v !== ''))->values()->all();

        $noShows = $assignments->filter(fn ($a) => $a->status === 'confirmed' && $a->shift && $a->shift->end_time->lt($now) && !isset($attendanceByShift[$a->shift_id]))->count();

        // ---- stats ----------------------------------------------------------
        $milestones = config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]);
        $hours = (float) $volunteer->total_hours;
        $next = collect($milestones)->first(fn ($m) => $m > $hours);
        $reliability = $volunteer->getReliabilityMetrics();
        $orgIds = $volunteer->engagedOrgIds();
        $orgs = Organization::whereIn('id', $orgIds ?: [0])->get(['id', 'name', 'city', 'verification_status', 'status']);

        $certificates = Certificate::withoutGlobalScopes()->with('organization')->where('volunteer_id', $volunteer->id)->latest('issued_date')->get()
            ->map(fn ($c) => ['number' => $c->certificate_number, 'milestone_hours' => $c->milestone_hours, 'organization' => $c->organization?->name, 'issued' => $this->local($c->issued_date)?->format('j M Y')])->all();

        $documents = VolunteerDocument::withoutGlobalScopes()->where('volunteer_id', $volunteer->id)->latest()->get()
            ->map(fn ($d) => array_filter(['title' => $d->title, 'type' => $d->document_type, 'status' => $d->verification_status, 'coordinator_note' => $d->coordinator_notes, 'uploaded' => $this->local($d->created_at)?->format('j M Y')]))->all();

        $announcements = Announcement::withoutGlobalScopes()->whereNull('deleted_at')->whereIn('org_id', $orgIds ?: [0])
            ->whereIn('target_audience', ['all', 'volunteers'])->latest()->take(6)->get()
            ->map(fn ($a) => ['title' => $a->title, 'message' => mb_strimwidth((string) $a->message, 0, 400, '…'), 'organization' => $orgs->firstWhere('id', $a->org_id)?->name, 'posted' => $this->local($a->created_at)?->format('D j M, H:i')])->all();

        return [
            'now' => [
                'local_time' => $now->copy()->setTimezone(self::TZ)->format('l j F Y, H:i'),
                'timezone'   => 'East Africa Time (Addis Ababa, UTC+3)',
            ],
            'me' => array_filter([
                'full_name'        => $user->full_name,
                'first_name'       => $user->first_name ?: explode(' ', (string) $user->full_name)[0],
                'email'            => $user->email,
                'phone'            => $user->phone,
                'bio'              => $volunteer->bio,
                'skills'           => collect($volunteer->skills ?? [])->map(fn ($s) => ['skill' => $this->label($s), 'verification' => (string) (($volunteer->skills_verification ?? [])[$s] ?? 'unverified')])->values()->all(),
                'availability'     => $availability ?: 'not set',
                'age_group'        => $volunteer->date_of_birth ? ($volunteer->isMinor() ? 'under 18' . ($volunteer->parental_consent_verified ? ' (parental consent verified)' : ' (needs a verified parental consent form before applying)') : 'adult') : null,
                'language'         => $user->locale === 'am' ? 'Amharic' : 'English',
                'alerts'           => ['telegram' => $user->telegram_chat_id ? 'connected' : 'not connected', 'sms' => $user->sms_opt_in ? 'on' : 'off'],
                'member_since'     => $this->local($user->created_at)?->format('F Y'),
                'profile_complete' => $this->completeness($volunteer),
            ], fn ($v) => $v !== null && $v !== ''),
            'my_location' => $location ? array_filter([
                'source' => $location['source'] ?? 'shared',
                'place'  => $location['label'] ?? null,
                'note'   => 'Distances below are straight-line from here; road distance is usually 20–40% longer.',
            ]) : 'unknown — ask the volunteer to share their location (button in the chat) or tell you their area if they want distances',
            'impact' => [
                'verified_hours'          => $hours,
                'hours_waiting_approval'  => round($attendance->filter(fn ($a) => $a->check_out_time && ($a->hours_status ?? 'pending') === 'pending')->sum(fn ($a) => $a->rawHours()), 2),
                'impact_score'            => (float) $volunteer->impact_score . ' / 100',
                'completed_shifts'        => $attendance->whereNotNull('check_out_time')->count(),
                'attendance_rate_percent' => $reliability['attendance_rate'] ?? null,
                'on_time_rate_percent'    => $reliability['on_time_rate'] ?? null,
                'missed_confirmed_shifts' => $noShows,
                'next_certificate_at'     => $next ? "{$next} hours" : 'all milestones earned',
                'hours_to_next_certificate' => $next ? round($next - $hours, 2) : 0,
                'certificate_milestones'  => $milestones,
            ],
            'organizations_i_volunteer_with' => $orgs->map(fn ($o) => array_filter(['name' => $o->name, 'city' => $o->city, 'verified' => $o->verification_status === 'verified']))->values()->all(),
            'my_upcoming_shifts' => $upcoming,
            'my_recent_attendance' => $recent,
            'my_certificates' => $certificates,
            'my_documents' => $documents,
            'announcements' => $announcements,
            'open_opportunities' => $this->opportunities($volunteer, $mySkills, $availability, $busy, $assignments->pluck('shift_id')->all(), $location, $now),
        ];
    }

    /** Open shifts, ranked for this volunteer, with plain reasons. */
    private function opportunities(Volunteer $volunteer, array $mySkills, array $availability, array $busy, array $appliedShiftIds, ?array $location, CarbonInterface $now): array
    {
        $shifts = Shift::withoutGlobalScope(TenantScope::class)
            ->whereNull('shifts.deleted_at')
            ->where('start_time', '>', $now)
            ->whereNotIn('id', $appliedShiftIds ?: [0])
            ->whereHas('event', fn ($q) => $q->withoutGlobalScope(TenantScope::class)->whereNull('events.deleted_at')
                ->whereIn('status', ['upcoming', 'ongoing'])
                ->whereIn('org_id', Organization::query()->public()->select('id')))
            ->with(['event' => fn ($q) => $q->withoutGlobalScope(TenantScope::class), 'event.organization'])
            ->withCount(['shiftAssignments as confirmed_count' => fn ($a) => $a->where('status', 'confirmed')])
            ->orderBy('start_time')->limit(250)->get();

        $rows = [];
        foreach ($shifts as $s) {
            $required = array_map('strtolower', $s->required_skills ?? []);
            $match = $this->skills->calculateMatchScore($mySkills, $required);
            $missing = array_values(array_diff($required, $mySkills));
            $left = max(0, (int) $s->capacity - (int) $s->confirmed_count);
            $slot = $this->slotOf($s->start_time);
            $fits = $availability ? in_array($slot, array_keys($availability), true) : null;
            $conflict = collect($busy)->contains(fn ($b) => $b[0]->lt($s->end_time) && $b[1]->gt($s->start_time));
            $km = $this->km($location, $s->event);
            $hoursAway = $now->diffInHours($s->start_time);

            $score = $match * 0.5
                + ($fits === true ? 18 : ($fits === null ? 8 : 0))
                + ($km === null ? 6 : 22 * exp(-$km / 12))
                + ($left > 0 && $left <= 2 ? 6 : 0)
                + ($hoursAway <= 72 ? 4 : 0)
                - ($conflict ? 60 : 0)
                - ($left === 0 ? 8 : 0);

            $reasons = [];
            if ($required && !$missing) $reasons[] = 'you have every skill it needs';
            elseif (!$required) $reasons[] = 'no special skills needed';
            elseif ($match > 0) $reasons[] = 'you cover ' . round($match) . '% of the skills';
            if ($fits === true) $reasons[] = 'fits your ' . $availability[$slot] . ' availability';
            if ($km !== null) $reasons[] = $this->kmText($km) . ' from you';
            if ($left > 0 && $left <= 2) $reasons[] = "only {$left} " . ($left === 1 ? 'place' : 'places') . ' left';
            if ($hoursAway <= 48) $reasons[] = 'starts ' . $this->relative($s->start_time, $now);

            $warnings = [];
            if ($conflict) $warnings[] = 'overlaps a shift you already have';
            if ($missing) $warnings[] = 'missing skills: ' . implode(', ', array_map([$this, 'label'], $missing));
            if ($left === 0) $warnings[] = 'full — applying puts you on the waitlist';
            if ($fits === false) $warnings[] = 'outside the availability on your profile';
            if ($volunteer->isMinor() && !$volunteer->parental_consent_verified) $warnings[] = 'needs a verified parental consent form first';

            $rows[] = ['score' => $score, 'shift' => $s, 'km' => $km] + $this->shiftRow($s, $location, $now) + array_filter([
                'skills_needed' => $required ? array_map([$this, 'label'], $required) : 'none',
                'skill_match_percent' => round($match),
                'places_left' => $left . ' of ' . $s->capacity,
                'why_it_fits' => $reasons,
                'watch_out' => $warnings ?: null,
            ], fn ($v) => $v !== null);
        }

        usort($rows, fn ($a, $b) => $b['score'] <=> $a['score']);
        $rows = array_slice($rows, 0, 30);

        return collect($rows)->values()->map(function ($r, $i) use ($location, $now) {
            $this->card($r['shift'], $location, $now, null, $r['why_it_fits'], $r['skill_match_percent']);
            unset($r['shift'], $r['score'], $r['km']);
            return ['rank' => $i + 1] + $r;
        })->all();
    }

    private function shiftRow(Shift $s, ?array $location, CarbonInterface $now): array
    {
        $e = $s->event;
        $km = $this->km($location, $e);
        $start = $this->local($s->start_time);
        $end = $this->local($s->end_time);

        return array_filter([
            'shift_id'     => $s->id,
            'event_id'     => $e->id,
            'event'        => $e->title,
            'shift'        => $s->title,
            'organization' => $e->organization?->name,
            'about'        => $e->description ? mb_strimwidth((string) $e->description, 0, 260, '…') : null,
            'shift_notes'  => $s->notes ? mb_strimwidth((string) $s->notes, 0, 200, '…') : null,
            'when'         => $start->format('D j M') . ', ' . $start->format('H:i') . '–' . $end->format('H:i'),
            'starts_in'    => $this->relative($s->start_time, $now),
            'starts_iso'   => $s->start_time->toIso8601String(),
            'duration_hours' => round($s->start_time->diffInMinutes($s->end_time) / 60, 1),
            'venue'        => $e->location,
            'venue_on_map' => $e->latitude !== null && $e->longitude !== null,
            'distance_from_me' => $km !== null ? $this->kmText($km) : null,
            'travel_estimate'  => $km !== null ? $this->travel($km) : null,
            'check_in_radius_m' => (int) ($e->geofence_radius ?: config('vms.geofence_default_radius', 100)),
        ], fn ($v) => $v !== null);
    }

    private function card(Shift $s, ?array $location, CarbonInterface $now, ?string $status, array $reasons = [], ?float $match = null): void
    {
        if (isset($this->cards[$s->id])) {
            return;
        }
        $e = $s->event;
        $km = $this->km($location, $e);
        $this->cards[$s->id] = array_filter([
            'shift_id'      => $s->id,
            'event_id'      => $e->id,
            'event_title'   => $e->title,
            'shift_title'   => $s->title,
            'organization'  => $e->organization?->name,
            'org_color'     => $e->organization?->primary_color,
            'start_time'    => $s->start_time->toIso8601String(),
            'end_time'      => $s->end_time->toIso8601String(),
            'location'      => $e->location,
            'latitude'      => $e->latitude !== null ? (float) $e->latitude : null,
            'longitude'     => $e->longitude !== null ? (float) $e->longitude : null,
            'distance_km'   => $km !== null ? round($km, 1) : null,
            'capacity'      => (int) $s->capacity,
            'confirmed'     => (int) ($s->confirmed_count ?? $s->confirmedCount()),
            'match'         => $match !== null ? (int) round($match) : null,
            'reasons'       => $reasons ?: null,
            'my_status'     => $status,
        ], fn ($v) => $v !== null);
    }

    private function checkInState(Shift $s, ?Attendance $att, CarbonInterface $now): string
    {
        if ($att && $att->check_out_time) return 'checked out at ' . $this->local($att->check_out_time)->format('H:i');
        if ($att) return 'checked in at ' . $this->local($att->check_in_time)->format('H:i') . ' — on shift now';
        $before = (int) config('vms.attendance.checkin_before_minutes', 15);
        $after = (int) config('vms.attendance.checkin_after_minutes', 30);
        $opens = $s->start_time->copy()->subMinutes($before);
        $closes = $s->start_time->copy()->addMinutes($after);
        if ($now->lt($opens)) return 'opens ' . $this->local($opens)->format('D j M, H:i') . " ({$before} min before start)";
        if ($now->lte($closes)) return 'open now until ' . $this->local($closes)->format('H:i');
        return 'window closed — ask the coordinator for a manual check-in';
    }

    private function availability($value): array
    {
        $labels = ['weekday_mornings' => 'weekday mornings', 'weekday_afternoons' => 'weekday afternoons', 'weekday_evenings' => 'weekday evenings', 'saturdays' => 'Saturdays', 'sundays' => 'Sundays', 'holidays' => 'public holidays'];
        $keys = is_array($value) ? (array_is_list($value) ? $value : array_keys(array_filter($value))) : [];
        $out = [];
        foreach ($keys as $k) {
            if (is_string($k)) $out[$k] = $labels[$k] ?? str_replace('_', ' ', $k);
        }
        return $out;
    }

    private function slotOf(CarbonInterface $t): string
    {
        $l = $this->local($t);
        if ($l->isSaturday()) return 'saturdays';
        if ($l->isSunday()) return 'sundays';
        return $l->hour < 12 ? 'weekday_mornings' : ($l->hour < 17 ? 'weekday_afternoons' : 'weekday_evenings');
    }

    private function completeness(Volunteer $v): string
    {
        $missing = [];
        if (!$v->user->phone) $missing[] = 'phone';
        if (!$v->bio) $missing[] = 'bio';
        if (!$v->skills) $missing[] = 'skills';
        if (!$this->availability($v->availability)) $missing[] = 'availability';
        if (!$v->user->profile_photo_path) $missing[] = 'photo';
        return $missing ? 'missing: ' . implode(', ', $missing) : 'complete';
    }

    private function km(?array $location, ?Event $e): ?float
    {
        if (!$location || !$e || $e->latitude === null || $e->longitude === null) {
            return null;
        }
        $r = 6371.0;
        $dLat = deg2rad((float) $e->latitude - $location['lat']);
        $dLng = deg2rad((float) $e->longitude - $location['lng']);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($location['lat'])) * cos(deg2rad((float) $e->latitude)) * sin($dLng / 2) ** 2;
        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function kmText(float $km): string
    {
        return $km < 1 ? round($km * 1000 / 10) * 10 . ' m' : round($km, 1) . ' km';
    }

    private function travel(float $km): string
    {
        $road = $km * 1.3;
        $drive = max(5, (int) round($road / 22 * 60 / 5) * 5); // city traffic ≈ 22 km/h
        $walk = (int) round($road / 4.5 * 60);
        return $walk <= 40 ? "about {$walk} min on foot or {$drive} min by taxi" : "about {$drive} min by car/taxi in normal traffic";
    }

    private function relative(CarbonInterface $t, CarbonInterface $now): string
    {
        $mins = (int) $now->diffInMinutes($t, false);
        if ($mins < 0) return 'already started';
        if ($mins < 60) return "in {$mins} min";
        if ($mins < 24 * 60) return 'in ' . intdiv($mins, 60) . ' h ' . ($mins % 60) . ' min';
        $days = (int) $this->local($now)->startOfDay()->diffInDays($this->local($t)->startOfDay());
        return $days === 1 ? 'tomorrow' : "in {$days} days";
    }

    private function local($t): ?Carbon
    {
        return $t ? Carbon::parse($t)->setTimezone(self::TZ) : null;
    }

    public function label(string $skill): string
    {
        return ucfirst(str_replace('_', ' ', $skill));
    }
}
