<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateVolunteerProfileRequest;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\EventResource;
use App\Http\Resources\ShiftAssignmentResource;
use App\Http\Resources\VolunteerResource;
use App\Models\Attendance;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Organization;
use App\Models\OrganizationReport;
use App\Models\Scopes\TenantScope;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Notifications\AppNotification;
use App\Services\AttendanceService;
use App\Services\Notifier;
use App\Services\SkillMatchingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class VolunteerController extends Controller
{
    public function __construct(
        private SkillMatchingService $skillMatcher,
        private AttendanceService $attendance,
        private Notifier $notifier,
    ) {}

    /**
     * Events volunteers can see: every active + verified organization's events
     * (volunteers are not locked to one organization). Suspended or inactive
     * organizations disappear immediately.
     */
    private function publicEvents()
    {
        return Event::withoutGlobalScope(TenantScope::class)
            ->whereIn('events.org_id', Organization::query()->public()->select('id'));
    }

    private function loadShifts($query, array $skills)
    {
        return $query->with(['organization', 'shifts' => fn ($q) => $q->orderBy('start_time')->withCount([
            'shiftAssignments as confirmed_count' => fn ($a) => $a->where('status', 'confirmed'),
        ])]);
    }

    private function scoreShifts($events, array $skills): void
    {
        foreach ($events as $event) {
            foreach ($event->shifts as $shift) {
                $shift->match_score = $this->skillMatcher->calculateMatchScore($skills, $shift->required_skills ?? []);
            }
        }
    }

    public function browseEvents(Request $request)
    {
        $volunteer = Auth::user()->volunteer;
        $skills    = $volunteer->skills ?? [];
        $when      = $request->query('when', 'upcoming');

        $query = $this->loadShifts($this->publicEvents(), $skills);
        if ($when === 'past') {
            $query->where(fn ($q) => $q->where('events.status', 'completed')->orWhere('events.end_date', '<', now()->toDateString()))->orderByDesc('start_date');
        } else {
            $query->whereIn('events.status', ['upcoming', 'ongoing'])->where('events.end_date', '>=', now()->toDateString())->orderBy('start_date');
        }
        if ($orgId = $request->query('org_id')) {
            $query->where('events.org_id', (int) $orgId);
        }
        if ($q = trim((string) $request->query('q'))) {
            $query->where(fn ($w) => $w->where('title', 'like', "%$q%")->orWhere('location', 'like', "%$q%")->orWhere('description', 'like', "%$q%"));
        }

        $events = $query->paginate(min(50, (int) $request->query('per_page', 12)));
        $this->scoreShifts($events->items(), $skills);

        return response()->json([
            'status'     => 'success',
            'data'       => EventResource::collection($events->items()),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'last_page'    => $events->lastPage(),
                'per_page'     => $events->perPage(),
                'total'        => $events->total(),
            ],
        ]);
    }

    /** G8 */
    public function showEvent($eventId)
    {
        $skills = Auth::user()->volunteer->skills ?? [];
        $event  = $this->loadShifts($this->publicEvents(), $skills)->findOrFail($eventId);
        $this->scoreShifts([$event], $skills);

        return response()->json(['status' => 'success', 'data' => new EventResource($event)]);
    }

    /** Organization page: profile, impact and its events (active / past). */
    public function showOrganization(Request $request, $orgId)
    {
        $org = Organization::query()->public()->findOrFail($orgId);
        $eventIds = Event::withoutGlobalScopes()->where('org_id', $org->id)->select('id');
        $shiftIds = Shift::whereIn('event_id', $eventIds)->select('id');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'            => $org->id,
                'name'          => $org->name,
                'logo_url'      => app(\App\Services\FileStore::class)->url($org->logo_path),
                'primary_color' => $org->primary_color,
                'website'       => $org->website,
                'email'         => $org->email,
                'phone'         => $org->phone,
                'city'          => $org->city,
                'country'       => $org->country,
                'address'       => $org->address,
                'verified'      => $org->verification_status === 'verified',
                'member_since'  => $org->created_at->toDateString(),
                'stats'         => [
                    'active_events'   => Event::withoutGlobalScopes()->where('org_id', $org->id)->whereIn('status', ['upcoming', 'ongoing'])->count(),
                    'past_events'     => Event::withoutGlobalScopes()->where('org_id', $org->id)->where('status', 'completed')->count(),
                    'volunteers'      => ShiftAssignment::whereIn('shift_id', $shiftIds)->where('status', 'confirmed')->distinct('volunteer_id')->count('volunteer_id'),
                    'verified_hours'  => round((float) Attendance::whereIn('shift_id', $shiftIds)->whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours'), 1),
                ],
            ],
        ]);
    }

    /** Report an organization to the platform team (fraud, safety, misleading event…). */
    public function reportOrganization(Request $request, $orgId)
    {
        $org  = Organization::findOrFail($orgId);
        $data = $request->validate([
            'category' => 'required|in:' . implode(',', OrganizationReport::CATEGORIES),
            'details'  => 'required|string|min:20|max:3000',
            'event_id' => 'nullable|integer',
        ]);

        $recent = OrganizationReport::where('reporter_id', Auth::id())->where('org_id', $org->id)->where('created_at', '>', now()->subDay())->exists();
        if ($recent) {
            return response()->json(['status' => 'error', 'message' => 'You already reported this organization today. The platform team is reviewing it.'], 429);
        }

        $report = OrganizationReport::create($data + ['org_id' => $org->id, 'reporter_id' => Auth::id(), 'status' => 'open']);

        $this->notifier->send($this->notifier->superAdmins(), new AppNotification(
            'organization_reported',
            'Report filed against ' . $org->name,
            str_replace('_', ' ', ucfirst($data['category'])) . ': ' . mb_strimwidth($data['details'], 0, 140, '…'),
            '/p/reports',
            ['report_id' => $report->id, 'org_id' => $org->id],
        ));

        return response()->json([
            'status'  => 'success',
            'message' => 'Thank you. The VolunTrack platform team has been notified and will review your report.',
            'data'    => ['id' => $report->id, 'status' => $report->status],
        ], 201);
    }

    public function applyForShift($shiftId)
    {
        $shift     = Shift::with('event.organization')->findOrFail($shiftId);
        $volunteer = Auth::user()->volunteer;
        $org       = $shift->event?->organization;

        if (!$org || !$org->isPublic()) {
            return response()->json(['status' => 'error', 'message' => 'This organization is not accepting volunteers right now.'], 403);
        }
        if (in_array($shift->event->status, ['completed', 'cancelled'], true) || $shift->start_time->isPast()) {
            return response()->json(['status' => 'error', 'message' => 'This shift has already started or the event is closed.'], 422);
        }
        if ($volunteer->isMinor() && !$volunteer->parental_consent_verified) {
            return response()->json(['status' => 'error', 'code' => 'consent_required',
                'message' => 'Volunteers under 18 need a verified parental consent form before applying for shifts.'], 422);
        }

        $existing = ShiftAssignment::where('shift_id', $shiftId)->where('volunteer_id', $volunteer->id)->first();
        if ($existing && in_array($existing->status, ['pending', 'confirmed'], true)) {
            return response()->json(['status' => 'error', 'message' => 'You have already applied for this shift.'], 422);
        }
        if ($existing && in_array($existing->status, ['rejected', 'removed'], true)) {
            return response()->json(['status' => 'error', 'message' => 'The coordinator already reviewed your application for this shift.'], 422);
        }

        $overlap = ShiftAssignment::join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
            ->where('shift_assignments.volunteer_id', $volunteer->id)
            ->whereIn('shift_assignments.status', ['pending', 'confirmed'])
            ->whereNull('shifts.deleted_at')
            ->where('shifts.start_time', '<', $shift->end_time)
            ->where('shifts.end_time', '>', $shift->start_time)
            ->select('shift_assignments.*')
            ->first();

        if ($overlap) {
            return response()->json([
                'status'            => 'error',
                'message'           => 'Scheduling Conflict: This shift overlaps with another shift you are already scheduled for or have applied to.',
                'conflict_shift_id' => $overlap->shift_id,
            ], 422);
        }

        $assignment = $existing ?? new ShiftAssignment(['shift_id' => $shift->id, 'volunteer_id' => $volunteer->id]);
        $assignment->fill([
            'status'      => 'pending',
            'assigned_at' => null,
            'match_score' => $this->skillMatcher->calculateMatchScore($volunteer->skills ?? [], $shift->required_skills ?? []),
        ])->save();

        Cache::forget("volunteer_{$volunteer->id}_schedule");

        return response()->json([
            'status'  => 'success',
            'message' => 'Application submitted successfully. Under coordinator review.',
            'data'    => new ShiftAssignmentResource($assignment),
        ], 201);
    }

    /**
     * Schedule with each shift's attendance state, so the app knows instantly
     * whether to show "Check in", "Check out", "Resume" or "Done".
     */
    public function getSchedule()
    {
        $this->attendance->sweepIfDue();
        $volunteer = Auth::user()->volunteer;

        $schedule = ShiftAssignment::where('volunteer_id', $volunteer->id)
            ->whereHas('shift')
            ->with(['shift.event.organization'])
            ->orderBy('created_at', 'desc')
            ->get();

        $attendance = Attendance::where('volunteer_id', $volunteer->id)->whereIn('shift_id', $schedule->pluck('shift_id'))
            ->with(['pings', 'shift.event.organization'])->get()->keyBy('shift_id');

        foreach ($schedule as $a) {
            $a->attendance_summary = isset($attendance[$a->shift_id]) ? $this->attendance->present($attendance[$a->shift_id]) : null;
        }

        return response()->json(['status' => 'success', 'data' => ShiftAssignmentResource::collection($schedule)]);
    }

    public function getProfile()
    {
        $volunteer = Auth::user()->volunteer;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'volunteer'        => new VolunteerResource($volunteer->load('user')),
                'reliability'      => $volunteer->getReliabilityMetrics(),
                'skills_alignment' => $volunteer->getSkillsAlignment(),
            ],
        ]);
    }

    public function updateProfile(UpdateVolunteerProfileRequest $request)
    {
        $user      = Auth::user();
        $volunteer = $user->volunteer;

        $userFields = array_filter($request->only(['first_name', 'last_name', 'phone']), fn ($v) => $v !== null);
        if ($request->has('full_name') && !$request->has('first_name')) {
            $userFields['full_name'] = $request->full_name;
        }
        if ($userFields) {
            $user->update($userFields);
        }

        $data = $request->only(['skills', 'availability', 'bio', 'date_of_birth']);
        if (isset($data['skills'])) {
            // Dropping a skill drops its verification; new skills start unverified.
            $data['skills_verification'] = array_intersect_key($volunteer->skills_verification ?? [], array_flip($data['skills']));
        }
        $volunteer->update($data);

        Cache::forget("volunteer_{$volunteer->id}_profile");

        return response()->json([
            'status'  => 'success',
            'message' => 'Volunteer profile updated successfully.',
            'data'    => new VolunteerResource($volunteer->fresh('user')),
        ]);
    }

    public function getCertificates()
    {
        $certificates = Certificate::withoutGlobalScopes()->with('organization')
            ->where('volunteer_id', Auth::user()->volunteer->id)->latest()->get();

        return response()->json(['status' => 'success', 'data' => CertificateResource::collection($certificates)]);
    }

    public function getImpactBreakdown()
    {
        $volunteer = Auth::user()->volunteer;
        $milestones   = config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]);
        $currentHours = (float) $volunteer->total_hours;
        $next = collect($milestones)->first(fn ($m) => $m > $currentHours);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_hours'            => $currentHours,
                'pending_hours'          => round(Attendance::where('volunteer_id', $volunteer->id)->whereNotNull('check_out_time')->where('hours_status', 'pending')->get()->sum(fn ($a) => $a->rawHours()), 2),
                'impact_score'           => (float) $volunteer->impact_score,
                'completed_shifts_count' => Attendance::where('volunteer_id', $volunteer->id)->whereNotNull('check_out_time')->count(),
                'organizations_helped'   => count($volunteer->engagedOrgIds()),
                'next_milestone'         => $next,
                'hours_to_next'          => $next ? round($next - $currentHours, 2) : 0.0,
                'earned_certificates'    => Certificate::withoutGlobalScopes()->where('volunteer_id', $volunteer->id)->count(),
            ],
        ]);
    }

    /** G10 — last 12 months of verified hours. */
    public function impactHistory()
    {
        $volunteer = Auth::user()->volunteer;
        $rows = Attendance::where('volunteer_id', $volunteer->id)->whereNotNull('check_in_time')
            ->where('check_in_time', '>=', now()->subMonths(11)->startOfMonth())->get();

        $out = [];
        $running = 0.0;
        for ($i = 11; $i >= 0; $i--) {
            $month = now()->subMonths($i)->format('Y-m');
            $inMonth = $rows->filter(fn ($a) => $a->check_in_time->format('Y-m') === $month);
            $hours = round($inMonth->sum(fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : 0), 2);
            $running += $hours;
            $out[] = [
                'month'         => $month,
                'hours'         => $hours,
                'pending_hours' => round($inMonth->where('hours_status', 'pending')->sum(fn ($a) => $a->rawHours()), 2),
                'shifts'        => $inMonth->count(),
                'impact_score'  => round(min(config('vms.impact_score_max', 100), $running * config('vms.impact_score_per_hour', 0.1)), 2),
            ];
        }

        return response()->json(['status' => 'success', 'data' => $out]);
    }

    /** Pending applications can be withdrawn any time; confirmed ones until 2 h before start. */
    public function withdrawApplication($assignmentId)
    {
        $volunteer  = Auth::user()->volunteer;
        $assignment = ShiftAssignment::with('shift.event')->where('id', $assignmentId)->where('volunteer_id', $volunteer->id)
            ->whereIn('status', ['pending', 'confirmed'])->firstOrFail();

        if ($assignment->status === 'confirmed') {
            if ($assignment->shift->start_time->lt(now()->addHours(2))) {
                return response()->json(['status' => 'error', 'message' => 'Your shift starts in less than 2 hours. Contact the coordinator instead of withdrawing.'], 422);
            }
            $assignment->update(['status' => 'cancelled', 'coordinator_feedback' => 'Withdrawn by volunteer.']);
            $this->notifier->send($this->notifier->staffOf($assignment->shift->event->org_id), new AppNotification(
                'volunteer_withdrew',
                Auth::user()->full_name . ' withdrew from ' . $assignment->shift->event->title,
                'A confirmed place on ' . $assignment->shift->start_time->toDayDateTimeString() . ' UTC is open again.',
                '/c/events/' . $assignment->shift->event_id,
            ));
        } else {
            $assignment->delete();
        }

        Cache::forget("volunteer_{$volunteer->id}_schedule");

        return response()->json(['status' => 'success', 'message' => 'Shift application withdrawn successfully.']);
    }
}
