<?php

namespace App\Services;

use App\Jobs\GenerateCertificateJob;
use App\Models\Attendance;
use App\Models\AttendancePing;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\User;
use App\Models\Volunteer;
use App\Notifications\AppNotification;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Everything about being on shift: rotating QR codes, self and staff
 * check-in/out, presence pings, automatic check-out and hours crediting.
 *
 * Hours only count once a coordinator verifies them (or the org enables
 * auto-verify for clean QR+GPS attendances). Crediting is delta-based so a
 * later adjustment never double counts.
 */
class AttendanceService
{
    public function __construct(
        private GeofenceService $geofence,
        private ImpactScoreService $impact,
        private Notifier $notifier,
    ) {}

    // ------------------------------------------------------------------
    // Rotating QR
    // ------------------------------------------------------------------

    public function policy(Shift $shift): array
    {
        return $shift->event?->organization?->attendancePolicy() ?? config('vms.attendance');
    }

    /** Current QR token for the coordinator's screen. */
    public function qrToken(Shift $shift): array
    {
        if (!$shift->qr_secret) {
            $shift->forceFill(['qr_secret' => bin2hex(random_bytes(32))])->save();
        }
        $period = (int) $this->policy($shift)['qr_window_seconds'];
        $window = intdiv(time(), $period);

        return [
            'token'          => $this->tokenFor($shift, $window),
            'period_seconds' => $period,
            'rotates_at'     => Carbon::createFromTimestamp(($window + 1) * $period)->toIso8601String(),
            // A scan stays valid for the current and the previous window.
            'valid_until'    => Carbon::createFromTimestamp(($window + 2) * $period)->toIso8601String(),
        ];
    }

    private function tokenFor(Shift $shift, int $window): string
    {
        $sig = substr(hash_hmac('sha256', $shift->id . '.' . $window, $shift->qr_secret), 0, 20);
        return "VT1.{$shift->id}.{$window}.{$sig}";
    }

    public function qrIsValid(Shift $shift, ?string $token): bool
    {
        if (!$token) {
            return false;
        }
        if (str_starts_with($token, 'VT1.')) {
            $parts = explode('.', $token);
            if (count($parts) !== 4 || (int) $parts[1] !== $shift->id || !$shift->qr_secret) {
                return false;
            }
            $period  = (int) $this->policy($shift)['qr_window_seconds'];
            $current = intdiv(time(), $period);
            $window  = (int) $parts[2];
            if ($window > $current || $window < $current - 1) {
                return false;
            }
            return hash_equals($this->tokenFor($shift, $window), $token);
        }

        // Legacy static signature (kept for printed codes); must not be expired.
        return $shift->qr_code_signature !== null
            && hash_equals((string) $shift->qr_code_signature, $token)
            && !($shift->qr_expires_at && $shift->qr_expires_at->isPast());
    }

    // ------------------------------------------------------------------
    // Volunteer check-in / check-out
    // ------------------------------------------------------------------

    public function checkIn(Volunteer $volunteer, Shift $shift, array $input): Attendance
    {
        $event  = $shift->event;
        $policy = $this->policy($shift);
        $this->ensureOrgOpen($event);

        return $this->locked($shift, $volunteer, function () use ($volunteer, $shift, $event, $policy, $input) {
            $assignment = ShiftAssignment::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)
                ->where('status', 'confirmed')->lockForUpdate()->first();
            if (!$assignment) {
                $this->fail('Security Gate: You are not scheduled or approved for this shift.', 403, 'not_confirmed');
            }

            $existing = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)->latest('id')->first();
            if ($existing && $existing->check_out_time === null) {
                $this->fail('You are already checked in to this shift.', 409, 'already_checked_in', ['attendance' => $this->present($existing)]);
            }
            if ($existing) {
                $this->fail('You already checked out of this shift. Use "Resume shift" within '
                    . $policy['undo_checkout_minutes'] . ' minutes of checking out, or ask the coordinator to check you back in.', 409, 'already_checked_out');
            }

            $now   = now();
            $start = $shift->start_time->copy();
            $open  = $start->copy()->subMinutes($policy['checkin_before_minutes']);
            $close = min($start->copy()->addMinutes($policy['checkin_after_minutes']), $shift->end_time->copy());
            if ($now->lt($open) || $now->gt($close)) {
                $this->fail('Check-in is unavailable. Check-in window is open between ' . $open->toTimeString() . ' and ' . $close->toTimeString() . ' (UTC).', 422, 'outside_window');
            }

            if ($policy['require_qr'] && !$this->qrIsValid($shift, $input['qr_code_signature'] ?? null)) {
                $this->fail('Validation Failed: Scanned QR code signature is invalid or has expired. Scan the code on the coordinator\'s screen again.', 422, 'qr_invalid');
            }

            $flags = [];
            if ($event->latitude && $event->longitude) {
                $accuracy = isset($input['accuracy']) ? (float) $input['accuracy'] : null;
                $radius   = (float) ($event->geofence_radius ?? config('vms.geofence_default_radius', 100));
                if ($accuracy !== null && $accuracy > max((float) $policy['max_gps_accuracy'], $radius)) {
                    $this->fail('Your GPS signal is too weak (±' . round($accuracy) . ' m). Step outside or away from tall buildings and try again.', 422, 'gps_inaccurate');
                }
                $distance = $this->geofence->getDistanceFromVenue((float) $input['latitude'], (float) $input['longitude'], $event);
                if ($distance > $radius) {
                    $this->fail('Location Blocked: You must be present at the physical venue to check in. You are '
                        . round($distance, 1) . ' meters away (Geofence limit: ' . $radius . ' meters).', 422, 'outside_geofence', ['distance_m' => round($distance, 1)]);
                }
            } else {
                $flags[] = 'no_venue_coordinates';
            }

            $attendance = new Attendance([
                'shift_id'          => $shift->id,
                'volunteer_id'      => $volunteer->id,
                'check_in_time'     => $now,
                'qr_verified'       => $policy['require_qr'],
                'check_in_method'   => 'self',
                'latitude'          => $input['latitude'],
                'longitude'         => $input['longitude'],
                'check_in_accuracy' => $input['accuracy'] ?? null,
                'device_id'         => $input['device_id'] ?? null,
                'hours_status'      => 'pending',
                'flags'             => $flags,
            ]);

            // Buddy-punching: one phone checking in several people.
            if (!empty($input['device_id'])) {
                $shared = Attendance::where('shift_id', $shift->id)->where('device_id', $input['device_id'])
                    ->where('volunteer_id', '!=', $volunteer->id)->get();
                if ($shared->isNotEmpty()) {
                    $attendance->addFlag('shared_device');
                    foreach ($shared as $other) {
                        $other->addFlag('shared_device');
                        $other->save();
                    }
                }
            }

            $attendance->save();
            $this->recordPing($attendance, $event, (float) $input['latitude'], (float) $input['longitude'], $input['accuracy'] ?? null);
            $this->forgetVolunteerCaches($volunteer);

            return $attendance;
        });
    }

    public function checkOut(Volunteer $volunteer, Shift $shift, array $input): Attendance
    {
        $event  = $shift->event;
        $policy = $this->policy($shift);

        return $this->locked($shift, $volunteer, function () use ($volunteer, $shift, $event, $policy, $input) {
            $attendance = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)
                ->whereNull('check_out_time')->lockForUpdate()->first();
            if (!$attendance) {
                $this->fail('No active check-in record found for this shift.', 404, 'not_checked_in');
            }

            $now   = now();
            $early = $now->lt($shift->end_time->copy()->subMinutes($policy['early_checkout_minutes']));
            $reason = trim((string) ($input['reason'] ?? ''));
            if ($early && $reason === '' && empty($input['force'])) {
                $this->fail('You are leaving before the shift ends (' . $shift->end_time->toTimeString() . ' UTC). Tell your coordinator why.', 422, 'reason_required', [
                    'minutes_early' => (int) $now->diffInMinutes($shift->end_time),
                ]);
            }

            $attendance->fill([
                'check_out_time'   => $now,
                'check_out_method' => 'self',
                'check_out_reason' => $reason !== '' ? $reason : null,
            ]);
            if ($early) {
                $attendance->addFlag('left_early');
            }

            if (isset($input['latitude'], $input['longitude']) && $event->latitude && $event->longitude) {
                $ping = $this->recordPing($attendance, $event, (float) $input['latitude'], (float) $input['longitude'], $input['accuracy'] ?? null);
                if (!$ping->inside) {
                    $attendance->addFlag('checked_out_off_site');
                }
            }
            $this->applyPresenceFlags($attendance, $policy);
            $attendance->save();

            if ($early) {
                $this->notifier->send($this->notifier->staffOf($event->org_id), new AppNotification(
                    'volunteer_left_early',
                    ($volunteer->user?->full_name ?? 'A volunteer') . ' left ' . $event->title . ' early',
                    'Checked out ' . (int) $now->diffInMinutes($shift->end_time) . ' min before the end. Reason: ' . ($reason ?: '—') . '. Open the live shift to fill the place.',
                    '/c/live/' . $shift->id,
                    ['shift_id' => $shift->id, 'attendance_id' => $attendance->id],
                ));
            }

            if ($policy['auto_verify_hours'] && $attendance->qr_verified && empty($attendance->flags)) {
                $this->verify($attendance, 'verified', null, 'Auto-verified: QR + GPS check-in with no anomalies.', null);
            }

            $this->forgetVolunteerCaches($volunteer);
            return $attendance->fresh();
        });
    }

    /** Re-open a mistaken check-out within the undo window, before the shift ends. */
    public function resume(Volunteer $volunteer, Shift $shift): Attendance
    {
        $policy = $this->policy($shift);

        return $this->locked($shift, $volunteer, function () use ($volunteer, $shift, $policy) {
            $attendance = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)
                ->whereNotNull('check_out_time')->latest('id')->lockForUpdate()->first();

            if (!$attendance || $attendance->check_out_method !== 'self' || $attendance->hours_status !== 'pending') {
                $this->fail('There is no check-out to undo for this shift.', 422, 'nothing_to_resume');
            }
            if ($attendance->check_out_time->lt(now()->subMinutes($policy['undo_checkout_minutes'])) || now()->gte($shift->end_time)) {
                $this->fail('It is too late to resume this shift yourself. Ask the coordinator to check you back in.', 422, 'resume_expired');
            }

            $flags = array_values(array_diff($attendance->flags ?? [], ['left_early', 'checked_out_off_site', 'low_presence']));
            $flags[] = 'resumed';
            $attendance->forceFill([
                'check_out_time'   => null,
                'check_out_method' => null,
                'check_out_reason' => null,
                'flags'            => array_values(array_unique($flags)),
            ])->save();

            $this->forgetVolunteerCaches($volunteer);
            return $attendance;
        });
    }

    /** Location heartbeat while the volunteer's app is open on shift. */
    public function ping(Volunteer $volunteer, Shift $shift, array $input): array
    {
        $attendance = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)
            ->whereNull('check_out_time')->first();
        if (!$attendance) {
            $this->fail('No active check-in record found for this shift.', 404, 'not_checked_in');
        }

        // At most one ping per minute is stored.
        $last = $attendance->pings()->latest('id')->first();
        if ($last && $last->created_at->gt(now()->subSeconds(50))) {
            return ['inside' => $last->inside, 'distance_m' => (float) $last->distance_m, 'stored' => false];
        }

        $ping = $this->recordPing($attendance, $shift->event, (float) $input['latitude'], (float) $input['longitude'], $input['accuracy'] ?? null);
        return ['inside' => $ping->inside, 'distance_m' => (float) $ping->distance_m, 'stored' => true];
    }

    // ------------------------------------------------------------------
    // Staff actions
    // ------------------------------------------------------------------

    /** Coordinator checks a volunteer in by hand (no phone / no data / no GPS). */
    public function staffCheckIn(ShiftAssignment $assignment, User $staff, array $input): Attendance
    {
        $shift     = $assignment->shift;
        $volunteer = $assignment->volunteer;

        return $this->locked($shift, $volunteer, function () use ($assignment, $shift, $volunteer, $staff, $input) {
            if ($assignment->status !== 'confirmed') {
                $this->fail('Only confirmed volunteers can be checked in. Approve the application first.', 422, 'not_confirmed');
            }
            $open = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)->whereNull('check_out_time')->first();
            if ($open) {
                $this->fail('Volunteer is already checked in to this shift.', 422, 'already_checked_in');
            }
            if (now()->gt($shift->end_time->copy()->addHours(12))) {
                $this->fail('This shift ended more than 12 hours ago. Record the hours from Verify hours instead.', 422, 'shift_over');
            }

            // A previous check-out is re-opened (volunteer came back) instead of creating a duplicate row.
            $previous = Attendance::where('shift_id', $shift->id)->where('volunteer_id', $volunteer->id)->latest('id')->first();
            if ($previous && $previous->hours_status === 'pending') {
                $previous->addFlag('reopened_by_staff');
                $previous->forceFill(['check_out_time' => null, 'check_out_method' => null, 'check_out_reason' => null, 'checked_out_by' => null])->save();
                return $previous;
            }

            $attendance = Attendance::create([
                'shift_id'          => $shift->id,
                'volunteer_id'      => $volunteer->id,
                'check_in_time'     => isset($input['time']) ? Carbon::parse($input['time']) : now(),
                'qr_verified'       => false,
                'check_in_method'   => 'manual',
                'checked_in_by'     => $staff->id,
                'signature_data'    => $input['signature_data'] ?? null,
                'verification_note' => $input['note'] ?? null,
                'hours_status'      => 'pending',
                'flags'             => array_values(array_filter([
                    !empty($input['id_verified']) ? 'id_checked' : null,
                    'manual_check_in',
                ])),
            ]);
            $this->forgetVolunteerCaches($volunteer);
            return $attendance;
        });
    }

    public function staffCheckOut(Attendance $attendance, User $staff, array $input): Attendance
    {
        if ($attendance->check_out_time !== null) {
            $this->fail('This volunteer is already checked out.', 422, 'already_checked_out');
        }
        $shift = $attendance->shift;
        $time  = isset($input['time']) ? Carbon::parse($input['time']) : now();
        if ($time->lt($attendance->check_in_time)) {
            $this->fail('Check-out time cannot be before check-in.', 422, 'invalid_time');
        }

        $attendance->fill([
            'check_out_time'   => $time,
            'check_out_method' => 'manual',
            'checked_out_by'   => $staff->id,
            'check_out_reason' => $input['reason'] ?? null,
        ]);
        if ($time->lt($shift->end_time->copy()->subMinutes($this->policy($shift)['early_checkout_minutes']))) {
            $attendance->addFlag('left_early');
        }
        $attendance->save();
        $this->forgetVolunteerCaches($attendance->volunteer);
        return $attendance;
    }

    /**
     * Verify / adjust / reject the hours of a finished attendance.
     * Credits (or debits) the difference against the volunteer's totals.
     */
    public function verify(Attendance $attendance, string $status, ?float $hours, ?string $note, ?User $by): Attendance
    {
        if ($attendance->check_out_time === null) {
            $this->fail('This volunteer is still on shift. Check them out first.', 422, 'still_on_shift');
        }

        return DB::transaction(function () use ($attendance, $status, $hours, $note, $by) {
            $attendance = Attendance::lockForUpdate()->find($attendance->id);
            $volunteer  = Volunteer::lockForUpdate()->find($attendance->volunteer_id);

            $before = in_array($attendance->hours_status, ['verified', 'adjusted'], true) ? (float) $attendance->verified_hours : 0.0;
            $credit = match ($status) {
                'verified' => $attendance->rawHours(),
                'adjusted' => round((float) $hours, 2),
                default    => 0.0,
            };

            $attendance->forceFill([
                'hours_status'      => $status,
                'verified_hours'    => $status === 'rejected' ? 0 : $credit,
                'verified_by'       => $by?->id,
                'verified_at'       => now(),
                'verification_note' => $note,
            ])->save();

            $delta = round($credit - $before, 2);
            if ($delta != 0.0) {
                $prevHours = (float) $volunteer->total_hours;
                $newHours  = max(0, round($prevHours + $delta, 2));
                $impact    = (float) $volunteer->impact_score;
                if ($delta > 0) {
                    $impact = min(config('vms.impact_score_max', 100), $impact + $this->impact->calculateIncrement($volunteer, $attendance, $attendance->shift));
                }
                $volunteer->forceFill(['total_hours' => $newHours, 'impact_score' => $impact])->save();

                foreach ($this->impact->checkMilestones($volunteer, $prevHours, $newHours) as $milestone) {
                    GenerateCertificateJob::dispatch($volunteer->id, (float) $milestone, $attendance->shift->event->org_id);
                }
            }

            if ($volunteer->user) {
                $label = ['verified' => 'verified', 'adjusted' => 'adjusted', 'rejected' => 'not approved'][$status];
                $this->notifier->send($volunteer->user, new AppNotification(
                    'hours_reviewed',
                    'Your hours for ' . $attendance->shift->event->title . ' were ' . $label,
                    $status === 'rejected'
                        ? 'The coordinator did not approve these hours.' . ($note ? " Note: $note" : '')
                        : number_format($credit, 2) . ' hours now count toward your impact.' . ($note ? " Note: $note" : ''),
                    '/v/impact',
                ));
            }

            $this->forgetVolunteerCaches($volunteer);
            return $attendance->fresh();
        });
    }

    // ------------------------------------------------------------------
    // Maintenance: automatic check-out + event status
    // ------------------------------------------------------------------

    /** Runs at most every 2 minutes from busy endpoints (Render has no cron). */
    public function sweepIfDue(): void
    {
        try {
            $last = DB::table('system_settings')->where('key', 'sweep.last')->value('value');
            if ($last && Carbon::parse($last)->gt(now()->subMinutes(2))) {
                return;
            }
            DB::table('system_settings')->updateOrInsert(['key' => 'sweep.last'], ['value' => now()->toIso8601String(), 'updated_at' => now()]);
            $this->sweep();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** @return array{auto_checked_out: int} */
    public function sweep(): array
    {
        $closed = 0;
        $open = Attendance::whereNull('check_out_time')->whereNotNull('check_in_time')
            ->whereHas('shift', fn ($q) => $q->where('end_time', '<', now()->subMinutes(5)))
            ->with('shift.event.organization', 'volunteer.user')->limit(500)->get();

        foreach ($open as $attendance) {
            $shift = $attendance->shift;
            if (!$shift || !$shift->event) {
                continue;
            }
            $grace = (int) $this->policy($shift)['auto_checkout_grace'];
            if ($shift->end_time->copy()->addMinutes($grace)->isFuture()) {
                continue;
            }
            // Credit up to the scheduled end, never the hours the app sat idle.
            $attendance->fill(['check_out_time' => $shift->end_time->copy(), 'check_out_method' => 'auto']);
            $attendance->addFlag('auto_checked_out');
            $this->applyPresenceFlags($attendance, $this->policy($shift));
            $attendance->save();
            $closed++;

            if ($attendance->volunteer?->user) {
                $this->notifier->send($attendance->volunteer->user, new AppNotification(
                    'auto_checked_out',
                    'You were checked out of ' . $shift->event->title,
                    'You did not check out, so we closed your shift at its scheduled end (' . $shift->end_time->toTimeString() . ' UTC). Your coordinator will confirm the hours.',
                    '/v/schedule',
                ));
            }
            $this->forgetVolunteerCaches($attendance->volunteer);
        }

        // Event status transitions (also scheduled when a cron exists).
        $today = now()->toDateString();
        Event::withoutGlobalScopes()->where('status', 'upcoming')->where('start_date', '<=', $today)->where('end_date', '>=', $today)->update(['status' => 'ongoing']);
        Event::withoutGlobalScopes()->whereIn('status', ['upcoming', 'ongoing'])->where('end_date', '<', $today)->update(['status' => 'completed']);

        return ['auto_checked_out' => $closed];
    }

    // ------------------------------------------------------------------
    // Presentation helpers
    // ------------------------------------------------------------------

    public function present(Attendance $a): array
    {
        $policy = $a->shift ? $this->policy($a->shift) : config('vms.attendance');
        $canResume = $a->check_out_time !== null && $a->check_out_method === 'self' && $a->hours_status === 'pending'
            && $a->check_out_time->gt(now()->subMinutes($policy['undo_checkout_minutes']))
            && $a->shift && now()->lt($a->shift->end_time);

        $pings = $a->relationLoaded('pings') ? $a->pings : $a->pings()->get();

        return [
            'id'               => $a->id,
            'shift_id'         => $a->shift_id,
            'volunteer_id'     => $a->volunteer_id,
            'check_in_time'    => $a->check_in_time?->toIso8601String(),
            'check_out_time'   => $a->check_out_time?->toIso8601String(),
            'qr_verified'      => (bool) $a->qr_verified,
            'check_in_method'  => $a->check_in_method ?? 'self',
            'check_out_method' => $a->check_out_method,
            'check_out_reason' => $a->check_out_reason,
            'hours'            => $a->rawHours(),
            'hours_status'     => $a->hours_status ?? 'pending',
            'verified_hours'   => $a->verified_hours !== null ? (float) $a->verified_hours : null,
            'verified_at'      => $a->verified_at?->toIso8601String(),
            'verification_note'=> $a->verification_note,
            'flags'            => $a->flags ?? [],
            'presence'         => [
                'pings'        => $pings->count(),
                'inside'       => $pings->where('inside', true)->count(),
                'last_ping_at' => $pings->max('created_at')?->toIso8601String(),
            ],
            'can_resume'       => $canResume,
            'created_at'       => $a->created_at?->toIso8601String(),
        ];
    }

    // ------------------------------------------------------------------

    private function recordPing(Attendance $attendance, Event $event, float $lat, float $lng, $accuracy): AttendancePing
    {
        $distance = ($event->latitude && $event->longitude) ? $this->geofence->getDistanceFromVenue($lat, $lng, $event) : 0.0;
        $radius   = (float) ($event->geofence_radius ?? config('vms.geofence_default_radius', 100));
        // Allow the reading's own uncertainty, capped so a vague fix can't count as "inside".
        $slack = min((float) ($accuracy ?? 0), $radius);

        return AttendancePing::create([
            'attendance_id' => $attendance->id ?? $attendance->getKey(),
            'latitude'      => $lat,
            'longitude'     => $lng,
            'accuracy'      => $accuracy,
            'distance_m'    => round($distance, 2),
            'inside'        => $distance <= $radius + $slack,
            'created_at'    => now(),
        ]);
    }

    /** Flag attendances whose pings show the volunteer away from the venue mid-shift. */
    private function applyPresenceFlags(Attendance $attendance, array $policy): void
    {
        $pings = $attendance->pings()->get();
        if ($pings->where('inside', false)->count() >= 2) {
            $attendance->addFlag('left_venue_during_shift');
        }
        $end      = $attendance->check_out_time ?? now();
        $minutes  = $attendance->check_in_time ? $attendance->check_in_time->diffInMinutes($end) : 0;
        $expected = intdiv((int) $minutes, max(1, (int) $policy['ping_interval_minutes']));
        if ($expected >= 6 && $pings->where('inside', true)->count() < $expected * 0.3) {
            $attendance->addFlag('low_presence');
        }
    }

    private function ensureOrgOpen(Event $event): void
    {
        $org = $event->organization;
        if (!$org || $org->status !== 'active') {
            $this->fail('This organization is not active on VolunTrack right now.', 403, 'organization_inactive');
        }
        if ($event->status === 'cancelled') {
            $this->fail('This event was cancelled.', 422, 'event_cancelled');
        }
    }

    /** Serialize concurrent requests for the same volunteer + shift (two phones, double taps). */
    private function locked(Shift $shift, Volunteer $volunteer, \Closure $fn)
    {
        $lock = Cache::lock("attendance:{$shift->id}:{$volunteer->id}", 10);
        try {
            $lock->block(5);
        } catch (\Throwable) {
            $this->fail('Another device is updating this shift right now. Try again in a moment.', 409, 'busy');
        }
        try {
            return DB::transaction($fn);
        } finally {
            optional($lock)->release();
        }
    }

    private function forgetVolunteerCaches(?Volunteer $volunteer): void
    {
        if (!$volunteer) {
            return;
        }
        Cache::forget("volunteer_{$volunteer->id}_profile");
        Cache::forget("volunteer_{$volunteer->id}_impact");
        Cache::forget("volunteer_{$volunteer->id}_schedule");
    }

    private function fail(string $message, int $status, string $code, array $extra = []): never
    {
        throw new HttpResponseException(response()->json(['status' => 'error', 'message' => $message, 'code' => $code] + $extra, $status));
    }
}
