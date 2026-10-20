<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApproveApplicationRequest;
use App\Http\Requests\CreateEventRequest;
use App\Http\Requests\CreateShiftRequest;
use App\Http\Requests\ForceCheckInRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Http\Resources\ShiftAssignmentResource;
use App\Http\Resources\ShiftResource;
use App\Http\Resources\VolunteerResource;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Volunteer;
use App\Notifications\AppNotification;
use App\Notifications\ShiftApprovedNotification;
use App\Services\AttendanceService;
use App\Services\AuditLogService;
use App\Services\Notifier;
use App\Services\PlanService;
use App\Services\SkillMatchingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CoordinatorController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private PlanService $plans,
        private Notifier $notifier,
        private AttendanceService $attendance,
        private SkillMatchingService $matcher,
    ) {}

    private function org(): Organization
    {
        return Organization::findOrFail(auth()->user()->org_id);
    }

    private function withCounts($query)
    {
        return $query->with(['shifts' => fn ($q) => $q->orderBy('start_time')->withCount([
            'shiftAssignments as confirmed_count' => fn ($a) => $a->where('status', 'confirmed'),
            'shiftAssignments as pending_count'   => fn ($a) => $a->where('status', 'pending'),
        ])]);
    }

    /** Assignment that belongs to one of this organization's shifts, or 404. */
    private function assignmentForStaff($assignmentId): ShiftAssignment
    {
        return ShiftAssignment::with(['shift.event', 'volunteer.user'])
            ->whereIn('shift_id', Shift::query()->forOrg(auth()->user()->org_id)->select('shifts.id'))
            ->findOrFail($assignmentId);
    }

    private function attendanceForStaff($attendanceId): Attendance
    {
        return Attendance::with(['shift.event', 'volunteer.user', 'pings'])
            ->whereIn('shift_id', Shift::query()->forOrg(auth()->user()->org_id)->select('shifts.id'))
            ->findOrFail($attendanceId);
    }

    private function validateShiftWindow(Event $event, string $start, string $end): ?string
    {
        $s = Carbon::parse($start)->toDateString();
        $e = Carbon::parse($end)->toDateString();
        if ($s < $event->start_date->toDateString() || $e > $event->end_date->toDateString()) {
            return 'Shift timings must fall within the event boundaries (' . $event->start_date->toDateString() . ' to ' . $event->end_date->toDateString() . ').';
        }
        if (Carbon::parse($end)->lte(Carbon::parse($start))) {
            return 'A shift must end after it starts.';
        }
        if (Carbon::parse($start)->diffInHours(Carbon::parse($end)) > 24) {
            return 'A single shift cannot be longer than 24 hours. Split it into several shifts.';
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    public function createEvent(CreateEventRequest $request)
    {
        $org = $this->org();
        $this->plans->ensureWithinLimit($org, 'active_events');

        $event = DB::transaction(function () use ($request, $org) {
            $event = Event::create([
                'org_id'          => $org->id,
                'title'           => $request->title,
                'description'     => $request->description,
                'location'        => $request->location,
                'latitude'        => $request->latitude,
                'longitude'       => $request->longitude,
                'start_date'      => $request->start_date,
                'end_date'        => $request->end_date,
                'status'          => 'upcoming',
                'geofence_radius' => $request->geofence_radius ?? config('vms.geofence_default_radius', 100),
            ]);

            foreach ($request->input('shifts', []) as $i => $s) {
                if ($error = $this->validateShiftWindow($event, $s['start_time'], $s['end_time'])) {
                    abort(response()->json(['message' => $error, 'errors' => ["shifts.$i.start_time" => [$error]]], 422));
                }
                $this->plans->ensureShiftCapacity($org, $event);
                $this->makeShift($event, $s);
            }
            return $event;
        });

        $this->audit->log('event.created', $event, [], $event->only(['title', 'location', 'start_date', 'end_date']));
        Cache::forget('org_' . $org->id . '_events');

        return response()->json([
            'status'  => 'success',
            'message' => 'Event created successfully.',
            'data'    => new EventResource($this->withCounts(Event::query())->find($event->id)),
        ], 201);
    }

    public function getEvents(Request $request)
    {
        $query = $this->withCounts(Event::query())->latest();
        if ($status = $request->query('status')) {
            $query->whereIn('status', explode(',', $status));
        }
        if ($q = trim((string) $request->query('q'))) {
            $query->where(fn ($w) => $w->where('title', 'like', "%$q%")->orWhere('location', 'like', "%$q%"));
        }
        $events = $query->paginate(min(100, (int) $request->query('per_page', config('vms.events_per_page', 15))));

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

    public function showEvent($eventId)
    {
        return response()->json([
            'status' => 'success',
            'data'   => new EventResource($this->withCounts(Event::query())->findOrFail($eventId)),
        ]);
    }

    public function updateEvent(UpdateEventRequest $request, $eventId)
    {
        $event   = Event::findOrFail($eventId);
        $fields  = ['title', 'description', 'location', 'latitude', 'longitude', 'start_date', 'end_date', 'status', 'geofence_radius'];
        $oldData = $event->only($fields);

        if ($request->has('start_date') || $request->has('end_date')) {
            $start = $request->input('start_date', $event->start_date->toDateString());
            $end   = $request->input('end_date', $event->end_date->toDateString());
            $outside = $event->shifts()->where(fn ($q) => $q->whereDate('start_time', '<', $start)->orWhereDate('end_time', '>', $end))->count();
            if ($outside > 0) {
                return response()->json(['message' => "{$outside} shift(s) fall outside the new dates. Move or delete them first.",
                    'errors' => ['start_date' => ['Shifts fall outside the new dates.']]], 422);
            }
        }

        $becameCancelled = $request->input('status') === 'cancelled' && $event->status !== 'cancelled';
        $event->update($request->only($fields));

        if ($becameCancelled) {
            $this->cancelAssignments(
                ShiftAssignment::whereIn('shift_id', $event->shifts()->pluck('id'))->whereIn('status', ['pending', 'confirmed'])->get(),
                'Event cancelled' . ($request->cancel_reason ? ': ' . $request->cancel_reason : '.'),
                $event->title . ' was cancelled',
            );
        }

        $this->audit->log('event.updated', $event, $oldData, $event->fresh()->only($fields));
        Cache::forget('org_' . auth()->user()->org_id . '_events');

        return response()->json([
            'status'  => 'success',
            'message' => 'Event updated successfully.',
            'data'    => new EventResource($this->withCounts(Event::query())->find($event->id)),
        ]);
    }

    public function deleteEvent($eventId)
    {
        $event = Event::findOrFail($eventId);
        $shiftIds = $event->shifts()->pluck('id');
        if (Attendance::whereIn('shift_id', $shiftIds)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteers already worked at this event, so it cannot be deleted. Mark it completed or cancelled instead.',
            ], 422);
        }

        $this->cancelAssignments(
            ShiftAssignment::whereIn('shift_id', $shiftIds)->whereIn('status', ['pending', 'confirmed'])->get(),
            'Event removed by the organization.',
            $event->title . ' was cancelled',
        );
        $oldData = $event->only(['title', 'location', 'start_date', 'end_date', 'status']);
        $event->shifts()->delete();
        $event->delete();

        $this->audit->log('event.deleted', $event, $oldData, []);
        Cache::forget('org_' . auth()->user()->org_id . '_events');

        return response()->json(['status' => 'success', 'message' => 'Event deleted successfully.']);
    }

    // ------------------------------------------------------------------
    // Shifts
    // ------------------------------------------------------------------

    private function makeShift(Event $event, array $s): Shift
    {
        return Shift::create([
            'event_id'          => $event->id,
            'title'             => $s['title'] ?? null,
            'notes'             => $s['notes'] ?? null,
            'start_time'        => $s['start_time'],
            'end_time'          => $s['end_time'],
            'required_skills'   => array_values(array_unique($s['required_skills'] ?? [])),
            'capacity'          => $s['capacity'],
            'qr_secret'         => bin2hex(random_bytes(32)),
            'qr_code_signature' => bin2hex(random_bytes(16)),
            'qr_expires_at'     => now()->addMinutes(config('vms.qr_expiry_minutes', 15)),
        ]);
    }

    public function createShift(CreateShiftRequest $request, $eventId)
    {
        $event = Event::findOrFail($eventId);
        if (in_array($event->status, ['completed', 'cancelled'], true)) {
            return response()->json(['status' => 'error', 'message' => 'This event is ' . $event->status . '; shifts can no longer be added.'], 422);
        }
        if ($error = $this->validateShiftWindow($event, $request->start_time, $request->end_time)) {
            return response()->json(['status' => 'error', 'message' => $error], 422);
        }
        $this->plans->ensureShiftCapacity($this->org(), $event);

        $shift = $this->makeShift($event, $request->validated());
        $this->audit->log('shift.created', $shift, [], $shift->only(['title', 'start_time', 'end_time', 'capacity']));

        return response()->json([
            'status'  => 'success',
            'message' => 'Shift created successfully.',
            'data'    => new ShiftResource($shift->fresh()),
        ], 201);
    }

    /** G12 — edit a shift. Capacity cannot drop below confirmed volunteers. */
    public function updateShift(Request $request, $shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        $data  = $request->validate([
            'title'             => 'sometimes|nullable|string|max:100',
            'notes'             => 'sometimes|nullable|string|max:1000',
            'start_time'        => 'sometimes|date_format:Y-m-d H:i:s',
            'end_time'          => 'sometimes|date_format:Y-m-d H:i:s',
            'capacity'          => 'sometimes|integer|min:1|max:10000',
            'required_skills'   => 'sometimes|array',
            'required_skills.*' => 'string|max:100',
        ]);

        $start = $data['start_time'] ?? $shift->start_time->format('Y-m-d H:i:s');
        $end   = $data['end_time'] ?? $shift->end_time->format('Y-m-d H:i:s');
        if ($error = $this->validateShiftWindow($shift->event, $start, $end)) {
            return response()->json(['message' => $error, 'errors' => ['start_time' => [$error]]], 422);
        }

        $started = Attendance::where('shift_id', $shift->id)->exists();
        if ($started && (isset($data['start_time']) && $data['start_time'] !== $shift->start_time->format('Y-m-d H:i:s'))) {
            return response()->json(['message' => 'Volunteers already checked in, so the start time is locked.',
                'errors' => ['start_time' => ['Locked after check-in started.']]], 422);
        }

        $confirmed = $shift->confirmedCount();
        if (isset($data['capacity']) && $data['capacity'] < $confirmed) {
            return response()->json(['message' => "{$confirmed} volunteers are already confirmed. Capacity cannot be lower than that — remove volunteers first.",
                'errors' => ['capacity' => ["At least {$confirmed}."]]], 422);
        }

        $old = $shift->only(['title', 'start_time', 'end_time', 'capacity', 'required_skills']);
        $timeChanged = isset($data['start_time']) || isset($data['end_time']);
        $shift->update($data);

        if ($timeChanged) {
            $users = ShiftAssignment::where('shift_id', $shift->id)->whereIn('status', ['pending', 'confirmed'])
                ->with('volunteer.user')->get()->pluck('volunteer.user')->filter();
            $this->notifier->send($users, new AppNotification(
                'shift_changed',
                'Shift time changed: ' . $shift->event->title,
                'New time: ' . $shift->start_time->toDayDateTimeString() . ' – ' . $shift->end_time->format('H:i') . ' UTC.',
                '/v/schedule',
            ));
        }

        $this->audit->log('shift.updated', $shift, $old, $shift->fresh()->only(array_keys($old)));
        Cache::forget("shift_{$shift->id}_capacity");

        return response()->json([
            'status'  => 'success',
            'message' => 'Shift updated.',
            'data'    => new ShiftResource($shift->fresh()),
        ]);
    }

    /**
     * G12 — delete a shift.
     * - Attendance already recorded → refused (hours must stay traceable).
     * - Pending / confirmed volunteers → their places are cancelled and they are told why.
     */
    public function deleteShift(Request $request, $shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        if (Attendance::where('shift_id', $shift->id)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteers already checked in to this shift, so it cannot be deleted. Reduce its capacity or leave it to finish.',
            ], 422);
        }

        $affected = ShiftAssignment::where('shift_id', $shift->id)->whereIn('status', ['pending', 'confirmed'])->with('volunteer.user')->get();
        $this->cancelAssignments(
            $affected,
            'Shift removed by the coordinator' . ($request->input('reason') ? ': ' . $request->input('reason') : '.'),
            'A shift you signed up for was removed',
        );

        $old = $shift->only(['title', 'start_time', 'end_time', 'capacity']);
        $shift->delete();
        $this->audit->log('shift.deleted', $shift, $old + ['volunteers_notified' => $affected->count()], []);

        return response()->json([
            'status'  => 'success',
            'message' => $affected->count()
                ? "Shift deleted. {$affected->count()} volunteer(s) were notified."
                : 'Shift deleted.',
            'data'    => ['volunteers_notified' => $affected->count()],
        ]);
    }

    private function cancelAssignments($assignments, string $reason, string $title): void
    {
        foreach ($assignments as $a) {
            $a->update(['status' => 'cancelled', 'coordinator_feedback' => $reason]);
            Cache::forget("volunteer_{$a->volunteer_id}_schedule");
        }
        $users = $assignments->map(fn ($a) => $a->volunteer?->user)->filter();
        $this->notifier->send($users, new AppNotification('shift_cancelled', $title, $reason, '/v/schedule'));
    }

    public function getShiftCapacity($shiftId)
    {
        $shift     = Shift::findForStaffOrFail($shiftId);
        $confirmed = $shift->confirmedCount();
        $remaining = max(0, $shift->capacity - $confirmed);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'shift_id'        => $shift->id,
                'total_capacity'  => $shift->capacity,
                'confirmed_count' => $confirmed,
                'remaining_slots' => $remaining,
                'is_full'         => $remaining === 0,
            ],
        ]);
    }

    /** G13 — who is on this shift and where each person is in the check-in flow. */
    public function roster($shiftId)
    {
        $this->attendance->sweepIfDue();
        $shift = Shift::findForStaffOrFail($shiftId);

        $assignments = ShiftAssignment::where('shift_id', $shift->id)
            ->whereIn('status', ['confirmed', 'pending', 'removed'])
            ->with('volunteer.user')->get();
        $attendances = Attendance::where('shift_id', $shift->id)->with('pings')->get()->keyBy('volunteer_id');

        return response()->json([
            'status' => 'success',
            'data'   => $assignments->map(fn ($a) => [
                'assignment_id' => $a->id,
                'status'        => $a->status,
                'volunteer'     => new VolunteerResource($a->volunteer),
                'attendance'    => isset($attendances[$a->volunteer_id]) ? $this->attendance->present($attendances[$a->volunteer_id]->setRelation('shift', $shift)) : null,
            ])->values(),
            'meta'   => [
                'shift'           => (new ShiftResource($shift))->resolve() + ['event' => [
                    'id' => $shift->event->id, 'title' => $shift->event->title, 'location' => $shift->event->location,
                    'geofence_radius' => $shift->event->geofence_radius,
                ]],
                'capacity'        => $shift->capacity,
                'confirmed'       => $assignments->where('status', 'confirmed')->count(),
                'checked_in'      => $attendances->whereNull('check_out_time')->count(),
                'checked_out'     => $attendances->whereNotNull('check_out_time')->count(),
                'left_early'      => $attendances->filter(fn ($x) => in_array('left_early', $x->flags ?? [], true))->count(),
                'open_places'     => max(0, $shift->capacity - $assignments->where('status', 'confirmed')->count()),
                'policy'          => $this->attendance->policy($shift),
            ],
        ]);
    }

    /**
     * Fill a place directly: add a volunteer (member or past applicant) to a shift as
     * confirmed — used when someone leaves early or does not show up.
     */
    public function assignVolunteer(Request $request, $shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        $data  = $request->validate(['volunteer_id' => 'required|integer', 'note' => 'nullable|string|max:500', 'replace_assignment_id' => 'nullable|integer']);

        $volunteer = Volunteer::query()->engagedWith(auth()->user()->org_id)->with('user')->findOrFail($data['volunteer_id']);

        if (!empty($data['replace_assignment_id'])) {
            $old = ShiftAssignment::where('shift_id', $shift->id)->findOrFail($data['replace_assignment_id']);
            $old->update(['status' => 'removed', 'coordinator_feedback' => 'Replaced on shift' . (!empty($data['note']) ? ': ' . $data['note'] : '.')]);
        }

        $existing = ShiftAssignment::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)->first();
        if ($existing && $existing->status === 'confirmed') {
            return response()->json(['status' => 'error', 'message' => 'This volunteer is already confirmed for the shift.'], 422);
        }
        if ($shift->confirmedCount() >= $shift->capacity) {
            return response()->json(['status' => 'error', 'message' => 'The shift is full. Increase capacity or replace someone.'], 422);
        }

        $assignment = $existing ?? new ShiftAssignment(['shift_id' => $shift->id, 'volunteer_id' => $volunteer->id]);
        $assignment->fill(['status' => 'confirmed', 'assigned_at' => now(), 'staff_notes' => $data['note'] ?? 'Added by coordinator'])->save();

        if ($volunteer->user) {
            $this->notifier->send($volunteer->user, new ShiftApprovedNotification($shift));
        }
        Cache::forget("volunteer_{$volunteer->id}_schedule");
        $this->audit->log('shift.volunteer_assigned', $assignment, [], ['volunteer_id' => $volunteer->id, 'shift_id' => $shift->id]);

        return response()->json([
            'status'  => 'success',
            'message' => ($volunteer->user?->full_name ?? 'Volunteer') . ' added to the shift.',
            'data'    => new ShiftAssignmentResource($assignment->load('volunteer.user')),
        ], 201);
    }

    /** Volunteers who could fill a place on this shift right now. */
    public function replacementCandidates($shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        $taken = ShiftAssignment::where('shift_id', $shift->id)->whereIn('status', ['confirmed'])->pluck('volunteer_id');
        $busy  = ShiftAssignment::where('status', 'confirmed')
            ->whereHas('shift', fn ($q) => $q->where('id', '!=', $shift->id)->where('start_time', '<', $shift->end_time)->where('end_time', '>', $shift->start_time))
            ->pluck('volunteer_id');

        $candidates = Volunteer::query()->engagedWith(auth()->user()->org_id)
            ->whereNotIn('volunteers.id', $taken)->whereNotIn('volunteers.id', $busy)
            ->with('user')->limit(200)->get()
            ->filter(fn ($v) => $v->user && $v->user->is_active !== false)
            ->map(fn ($v) => [
                'volunteer'   => new VolunteerResource($v),
                'match_score' => $this->matcher->calculateMatchScore($v->skills ?? [], $shift->required_skills ?? []),
                'applied'     => ShiftAssignment::where('shift_id', $shift->id)->where('volunteer_id', $v->id)->value('status'),
            ])
            ->sortByDesc('match_score')->values()->take(50);

        return response()->json(['status' => 'success', 'data' => $candidates]);
    }

    // ------------------------------------------------------------------
    // Applications
    // ------------------------------------------------------------------

    public function getApplications($eventId)
    {
        $event = Event::findOrFail($eventId);

        $assignments = ShiftAssignment::whereIn('shift_id', $event->shifts()->pluck('id'))
            ->with(['shift', 'volunteer.user'])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => ShiftAssignmentResource::collection($assignments),
        ]);
    }

    public function approveApplication(ApproveApplicationRequest $request, $assignmentId)
    {
        $assignment = $this->assignmentForStaff($assignmentId);
        $status     = $request->status === 'cancelled' ? 'rejected' : $request->status;

        if ($status === 'confirmed') {
            $confirmedCount = ShiftAssignment::where('shift_id', $assignment->shift_id)->where('status', 'confirmed')->count();
            if ($assignment->status !== 'confirmed' && $confirmedCount >= $assignment->shift->capacity) {
                return response()->json(['status' => 'error', 'message' => 'Shift capacity has already been reached.'], 422);
            }
            if ($assignment->volunteer?->isMinor() && !$assignment->volunteer->parental_consent_verified) {
                return response()->json(['status' => 'error', 'message' => 'This volunteer is under 18 and has no verified parental consent yet.'], 422);
            }
        }

        $assignment->update([
            'status'               => $status,
            'assigned_at'          => $status === 'confirmed' ? now() : null,
            'coordinator_feedback' => $status === 'rejected' ? $request->reason : $assignment->coordinator_feedback,
        ]);

        $user = $assignment->volunteer?->user;
        if ($user && $status === 'confirmed') {
            $this->notifier->send($user, new ShiftApprovedNotification($assignment->shift));
        } elseif ($user) {
            $this->notifier->send($user, new AppNotification(
                'application_declined',
                'Application not accepted: ' . $assignment->shift->event->title,
                $request->reason ?: 'The coordinator could not offer you a place on this shift. Other opportunities are open.',
                '/v/opportunities',
            ));
        }

        $this->audit->log('application.' . ($status === 'confirmed' ? 'approved' : 'declined'), $assignment, [], [
            'volunteer' => $user?->full_name, 'shift_id' => $assignment->shift_id, 'reason' => $request->reason,
        ]);
        Cache::forget("shift_{$assignment->shift_id}_capacity");
        Cache::forget("volunteer_{$assignment->volunteer_id}_schedule");

        return response()->json([
            'status'  => 'success',
            'message' => 'Application status updated to ' . $status . '.',
            'data'    => new ShiftAssignmentResource($assignment->fresh(['shift', 'volunteer.user'])),
        ]);
    }

    /** Take a confirmed volunteer off a shift (no-show, swap). */
    public function removeAssignment(Request $request, $assignmentId)
    {
        $assignment = $this->assignmentForStaff($assignmentId);
        $data = $request->validate(['reason' => 'required|string|max:500']);
        if (Attendance::where('shift_id', $assignment->shift_id)->where('volunteer_id', $assignment->volunteer_id)->whereNull('check_out_time')->exists()) {
            return response()->json(['status' => 'error', 'message' => 'Check this volunteer out before removing them.'], 422);
        }
        $assignment->update(['status' => 'removed', 'coordinator_feedback' => $data['reason']]);
        if ($assignment->volunteer?->user) {
            $this->notifier->send($assignment->volunteer->user, new AppNotification(
                'shift_cancelled', 'You were taken off a shift: ' . $assignment->shift->event->title, $data['reason'], '/v/schedule'));
        }
        Cache::forget("volunteer_{$assignment->volunteer_id}_schedule");
        $this->audit->log('shift.volunteer_removed', $assignment, [], ['reason' => $data['reason']]);

        return response()->json(['status' => 'success', 'message' => 'Volunteer removed from the shift.']);
    }

    public function getAiFeedback($assignmentId)
    {
        $assignment = $this->assignmentForStaff($assignmentId);
        $volunteer  = $assignment->volunteer;
        $user       = $volunteer->user;
        $shift      = $assignment->shift;

        $requiredSkills  = array_map('strtolower', $shift->required_skills ?? []);
        $volunteerSkills = array_map('strtolower', $volunteer->skills ?? []);
        $missingSkills   = array_diff($requiredSkills, $volunteerSkills);
        $name = $user?->first_name ?: ($user?->full_name ?? 'there');

        if (empty($requiredSkills)) {
            $feedback = "Hi {$name}, thank you so much for applying to this shift! We do not require any specific skills for this shift, and we would love to have you onboard. We look forward to seeing you soon!";
        } elseif (empty($missingSkills)) {
            $feedback = "Hi {$name}, your profile has a perfect 100% skills alignment for this shift! We have confirmed your skills and credentials. We are excited to work with you on {$shift->start_time->toDayDateTimeString()}!";
        } else {
            $feedback = "Hi {$name}, we'd love to have you onboard, but we need an updated certificate or experience verification for: " . implode(', ', array_map(fn ($s) => ucfirst(str_replace('_', ' ', $s)), $missingSkills)) . ' before shift approval. Could you upload the latest copy?';
        }

        return response()->json([
            'status'              => 'success',
            'assignment_id'       => $assignmentId,
            'missing_skills'      => array_values($missingSkills),
            'ai_drafted_feedback' => $feedback,
        ]);
    }

    // ------------------------------------------------------------------
    // Attendance (staff side)
    // ------------------------------------------------------------------

    /** Manual check-in for volunteers without a phone / data / GPS. */
    public function forceCheckIn(ForceCheckInRequest $request, $assignmentId)
    {
        $assignment = $this->assignmentForStaff($assignmentId);
        $attendance = $this->attendance->staffCheckIn($assignment, auth()->user(), $request->validated());
        $this->audit->log('attendance.manual_check_in', $attendance, [], [
            'volunteer' => $assignment->volunteer?->user?->full_name, 'id_verified' => (bool) $request->id_verified, 'note' => $request->note,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Coordinator check-in recorded.',
            'data'    => $this->attendance->present($attendance->fresh()),
        ], 201);
    }

    public function staffCheckOut(Request $request, $attendanceId)
    {
        $attendance = $this->attendanceForStaff($attendanceId);
        $data = $request->validate(['reason' => 'nullable|string|max:500', 'time' => 'nullable|date']);
        $attendance = $this->attendance->staffCheckOut($attendance, auth()->user(), $data);
        $this->audit->log('attendance.manual_check_out', $attendance, [], ['volunteer' => $attendance->volunteer?->user?->full_name, 'reason' => $data['reason'] ?? null]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Volunteer checked out.',
            'data'    => $this->attendance->present($attendance->fresh()),
        ]);
    }

    /** G14 — finished attendances waiting for a coordinator. */
    public function pendingHours(Request $request)
    {
        $this->attendance->sweepIfDue();
        $status = $request->query('status', 'pending');

        $rows = Attendance::whereIn('shift_id', Shift::query()->forOrg(auth()->user()->org_id)->select('shifts.id'))
            ->whereNotNull('check_out_time')
            ->when($status !== 'all', fn ($q) => $q->where('hours_status', $status))
            ->with(['shift.event', 'volunteer.user', 'pings'])
            ->latest('check_out_time')->limit(300)->get();

        return response()->json([
            'status' => 'success',
            'data'   => $rows->map(fn ($a) => $this->attendance->present($a) + [
                'volunteer' => new VolunteerResource($a->volunteer),
                'shift'     => (new ShiftResource($a->shift))->resolve() + ['event' => ['id' => $a->shift->event->id, 'title' => $a->shift->event->title, 'location' => $a->shift->event->location]],
                'scheduled_hours' => round($a->shift->start_time->diffInMinutes($a->shift->end_time) / 60, 2),
            ])->values(),
        ]);
    }

    public function verifyHours(Request $request, $attendanceId)
    {
        $attendance = $this->attendanceForStaff($attendanceId);
        $data = $request->validate([
            'status'         => 'required|in:verified,adjusted,rejected',
            'verified_hours' => 'required_if:status,adjusted|nullable|numeric|min:0|max:24',
            'note'           => 'nullable|string|max:1000|required_if:status,rejected',
        ]);

        $old = ['hours_status' => $attendance->hours_status, 'verified_hours' => $attendance->verified_hours];
        $attendance = $this->attendance->verify($attendance, $data['status'], $data['verified_hours'] ?? null, $data['note'] ?? null, auth()->user());
        $this->audit->log('attendance.hours_' . $data['status'], $attendance, $old, [
            'hours_status' => $attendance->hours_status, 'verified_hours' => (float) $attendance->verified_hours, 'volunteer' => $attendance->volunteer?->user?->full_name,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Hours ' . $data['status'] . '.',
            'data'    => $this->attendance->present($attendance),
        ]);
    }

    // ------------------------------------------------------------------
    // Volunteers
    // ------------------------------------------------------------------

    /**
     * Everyone who works with this organization: members (registered under it)
     * and volunteers who applied to any of its shifts. Each row carries what the
     * coordinator needs: relationship, upcoming shifts, hours here, last seen.
     */
    public function listVolunteers(Request $request)
    {
        $orgId    = auth()->user()->org_id;
        $shiftIds = Shift::query()->forOrg($orgId)->select('shifts.id');

        $query = Volunteer::query()->engagedWith($orgId)->with('user');
        if ($q = trim((string) $request->query('q'))) {
            $query->whereHas('user', fn ($u) => $u->where(fn ($w) => $w->where('full_name', 'like', "%$q%")->orWhere('email', 'like', "%$q%")->orWhere('phone', 'like', "%$q%")));
        }
        if ($skill = $request->query('skill')) {
            $query->whereJsonContains('skills', $skill);
        }
        $page = $query->orderByDesc('volunteers.total_hours')->paginate(min(100, (int) $request->query('per_page', 25)));
        $ids  = collect($page->items())->pluck('id');

        $assignments = ShiftAssignment::whereIn('volunteer_id', $ids)->whereIn('shift_id', $shiftIds)->with('shift')->get()->groupBy('volunteer_id');
        $attendance  = Attendance::whereIn('volunteer_id', $ids)->whereIn('shift_id', $shiftIds)->get()->groupBy('volunteer_id');

        $rows = collect($page->items())->map(function ($v) use ($assignments, $attendance, $orgId) {
            $mine = $assignments[$v->id] ?? collect();
            $att  = $attendance[$v->id] ?? collect();
            return (new VolunteerResource($v))->resolve() + [
                'relationship'  => $v->user?->org_id === $orgId ? 'member' : 'applicant',
                'org_stats'     => [
                    'pending_applications' => $mine->where('status', 'pending')->count(),
                    'upcoming_shifts'      => $mine->where('status', 'confirmed')->filter(fn ($a) => $a->shift && $a->shift->end_time->isFuture())->count(),
                    'shifts_worked'        => $att->whereNotNull('check_out_time')->count(),
                    'hours_here'           => round($att->sum(fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : 0), 2),
                    'hours_pending'        => round($att->where('hours_status', 'pending')->sum(fn ($a) => $a->rawHours()), 2),
                    'last_shift_at'        => $att->max('check_in_time')?->toIso8601String(),
                    'on_shift_now'         => $att->whereNull('check_out_time')->isNotEmpty(),
                ],
            ];
        });

        return response()->json([
            'status'     => 'success',
            'data'       => $rows->values(),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    public function showVolunteer($volunteerId)
    {
        $orgId     = auth()->user()->org_id;
        $volunteer = Volunteer::query()->engagedWith($orgId)->with('user')->findOrFail($volunteerId);
        $shiftIds  = Shift::query()->forOrg($orgId)->select('shifts.id');

        $history = ShiftAssignment::where('volunteer_id', $volunteer->id)->whereIn('shift_id', $shiftIds)
            ->with('shift.event')->latest()->limit(100)->get();
        $attendance = Attendance::where('volunteer_id', $volunteer->id)->whereIn('shift_id', $shiftIds)->get()->keyBy('shift_id');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'volunteer'        => new VolunteerResource($volunteer),
                'reliability'      => $volunteer->getReliabilityMetrics(),
                'skills_alignment' => $volunteer->getSkillsAlignment(),
                'relationship'     => $volunteer->user?->org_id === $orgId ? 'member' : 'applicant',
                'history'          => $history->map(fn ($a) => [
                    'assignment_id' => $a->id,
                    'status'        => $a->status,
                    'event'         => ['id' => $a->shift?->event?->id, 'title' => $a->shift?->event?->title],
                    'shift'         => ['id' => $a->shift?->id, 'title' => $a->shift?->title, 'start_time' => $a->shift?->start_time?->toIso8601String(), 'end_time' => $a->shift?->end_time?->toIso8601String()],
                    'attendance'    => isset($attendance[$a->shift_id]) ? $this->attendance->present($attendance[$a->shift_id]) : null,
                ])->values(),
            ],
        ]);
    }

    /** G7 — mark one of the volunteer's skills verified / rejected. */
    public function verifySkill(Request $request, $volunteerId, string $skill)
    {
        $data      = $request->validate(['status' => 'required|in:unverified,pending,verified,rejected']);
        $volunteer = Volunteer::query()->engagedWith(auth()->user()->org_id)->with('user')->findOrFail($volunteerId);
        if (!in_array($skill, $volunteer->skills ?? [], true)) {
            return response()->json(['message' => 'The volunteer does not list this skill.', 'errors' => ['skill' => ['Not on profile.']]], 422);
        }
        $map = $volunteer->skills_verification ?? [];
        $map[$skill] = $data['status'];
        $volunteer->update(['skills_verification' => $map]);
        $this->audit->log('volunteer.skill_' . $data['status'], $volunteer, [], ['skill' => $skill, 'volunteer' => $volunteer->user?->full_name]);
        Cache::forget("volunteer_{$volunteer->id}_profile");

        return response()->json(['status' => 'success', 'data' => new VolunteerResource($volunteer->fresh('user'))]);
    }

    // ------------------------------------------------------------------
    // Dashboard & broadcast preview
    // ------------------------------------------------------------------

    /** G17 */
    public function dashboard()
    {
        $this->attendance->sweepIfDue();
        $orgId    = auth()->user()->org_id;
        $shiftIds = Shift::query()->forOrg($orgId)->select('shifts.id');
        $today    = [now()->startOfDay(), now()->endOfDay()];

        $future = Shift::query()->forOrg($orgId)->where('start_time', '>', now())
            ->withCount(['shiftAssignments as confirmed_count' => fn ($q) => $q->where('status', 'confirmed')])->get();

        $hoursThisMonth = Attendance::whereIn('shift_id', $shiftIds)->whereIn('hours_status', ['verified', 'adjusted'])
            ->where('check_in_time', '>=', now()->startOfMonth())->sum('verified_hours');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'shifts_today'         => Shift::query()->forOrg($orgId)->whereBetween('start_time', $today)->count(),
                'checked_in_now'       => Attendance::whereIn('shift_id', $shiftIds)->whereNull('check_out_time')->whereNotNull('check_in_time')->count(),
                'pending_applications' => ShiftAssignment::whereIn('shift_id', $shiftIds)->where('status', 'pending')->count(),
                'underfilled_shifts'   => $future->filter(fn ($s) => $s->confirmed_count < $s->capacity * 0.5)->count(),
                'hours_this_month'     => round((float) $hoursThisMonth, 2),
                'hours_to_verify'      => Attendance::whereIn('shift_id', $shiftIds)->whereNotNull('check_out_time')->where('hours_status', 'pending')->count(),
                'left_early_today'     => Attendance::whereIn('shift_id', $shiftIds)->whereBetween('check_out_time', $today)->where('flags', 'like', '%left_early%')->count(),
                'active_volunteers'    => ShiftAssignment::whereIn('shift_id', $shiftIds)->where('status', 'confirmed')->distinct('volunteer_id')->count('volunteer_id'),
            ],
        ]);
    }

    /** G16 — who an urgent alert would reach. */
    public function broadcastPreview($shiftId)
    {
        $shift      = Shift::findForStaffOrFail($shiftId);
        $recipients = app(\App\Services\BroadcastService::class)->recipients($shift);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'matching_volunteers' => $recipients->count(),
                'remaining_slots'     => max(0, $shift->capacity - $shift->confirmedCount()),
                'sample'              => $recipients->take(6)->map(fn ($v) => ['id' => $v->id, 'full_name' => $v->user?->full_name, 'skills' => $v->skills ?? []])->values(),
                'plan'                => $this->plans->snapshot($this->org())['limits']['broadcasts_per_month'] ?? null,
            ],
        ]);
    }
}
