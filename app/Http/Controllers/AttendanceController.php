<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Http\Resources\AttendanceResource;
use App\Jobs\GenerateCertificateJob;
use App\Models\Attendance;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Services\GeofenceService;
use App\Services\ImpactScoreService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class AttendanceController extends Controller
{
    public function __construct(
        private GeofenceService $geofence,
        private ImpactScoreService $impact,
    ) {}
    /**
     * Generate a signed QR code signature for a shift.
     * Accessible by Coordinators.
     */
    public function generateQrCode($shiftId)
    {
        $shift = Shift::findOrFail($shiftId);

        // Regenerate time-limited QR code signature
        $signature = bin2hex(random_bytes(16)) . '_' . time();
        $shift->update([
            'qr_code_signature' => $signature,
        ]);

        return response()->json([
            'status' => 'success',
            'qr_code_signature' => $signature,
            'expires_at' => Carbon::now()->addMinutes(15)->toDateTimeString()
        ]);
    }

    /**
     * Perform GPS-verified & QR-verified check-in for volunteers.
     */
    public function checkIn(CheckInRequest $request)
    {
        // Subtask 9.2.1.2: Time-drift Anti-Fraud Validation
        $clientTime = Carbon::parse($request->client_timestamp);
        if ($clientTime->diffInMinutes(now()) > 2) {
            return response()->json([
                'status' => 'error',
                'message' => 'Security Error: High time-drift detected. Ensure your device clock is synced accurately to the network.'
            ], 422);
        }

        $shift = Shift::with('event')->findOrFail($request->shift_id);
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        // 1. Verify Confirmed Assignment
        $assignment = ShiftAssignment::where('shift_id', $shift->id)
            ->where('volunteer_id', $volunteer->id)
            ->where('status', 'confirmed')
            ->first();

        if (!$assignment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Security Gate: You are not scheduled or approved for this shift.'
            ], 403);
        }

        // 2. Check if already checked in
        $existing = Attendance::where('shift_id', $shift->id)
            ->where('volunteer_id', $volunteer->id)
            ->whereNull('check_out_time')
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'You are already checked in to this shift.'
            ], 422);
        }

        // 3. Temporal Boundary Validation (Within shift window +/- 15 min buffer)
        $now = Carbon::now();
        $shiftStart = Carbon::parse($shift->start_time);
        $bufferStart = $shiftStart->copy()->subMinutes(15);
        $bufferEnd = $shiftStart->copy()->addMinutes(30); // allow late check-in up to 30 mins

        if ($now->lessThan($bufferStart) || $now->greaterThan($bufferEnd)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Check-in is unavailable. Check-in window is open between ' . $bufferStart->toTimeString() . ' and ' . $bufferEnd->toTimeString() . '.'
            ], 422);
        }

        // 4. QR Signature & Expiration Validation (Task 26)
        if ($shift->qr_code_signature !== $request->qr_code_signature || ($shift->qr_expires_at && $shift->qr_expires_at->isPast())) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validation Failed: Scanned QR code signature is invalid or has expired.'
            ], 422);
        }

        // 5. GPS Geofence Validation — delegated to GeofenceService
        $event = $shift->event;
        if ($event->latitude && $event->longitude) {
            if (!$this->geofence->isWithinGeofence((float) $request->latitude, (float) $request->longitude, $event)) {
                $distance = $this->geofence->getDistanceFromVenue((float) $request->latitude, (float) $request->longitude, $event);
                $radius   = $event->geofence_radius ?? config('vms.geofence_default_radius', 100);
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Location Blocked: You must be present at the physical venue to check in. ' .
                                 'You are ' . round($distance, 1) . ' meters away (Geofence limit: ' . $radius . ' meters).'
                ], 422);
            }
        }

        // 6. Record Attendance
        $attendance = Attendance::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $volunteer->id,
            'check_in_time' => now(),
            'qr_verified' => true,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Check-in verified successfully. Welcome to your shift!',
            'data'    => new AttendanceResource($attendance),
        ], 201);
    }

    /**
     * Perform shift check-out and dynamically accumulate hours and impact metrics.
     */
    public function checkOut(CheckOutRequest $request)
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        // Locate active attendance record
        $attendance = Attendance::where('shift_id', $request->shift_id)
            ->where('volunteer_id', $volunteer->id)
            ->whereNull('check_out_time')
            ->first();

        if (!$attendance) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active check-in record found for this shift.'
            ], 404);
        }

        $checkIn = Carbon::parse($attendance->check_in_time);
        $checkOut = Carbon::now();

        // Calculate hours served
        $durationHours = round($checkIn->diffInMinutes($checkOut) / 60, 2);

        // Save checkout
        $attendance->update([
            'check_out_time' => $checkOut,
        ]);

        // Accumulate metrics — delegated to ImpactScoreService
        $prevHours       = (float) $volunteer->total_hours;
        $newHours        = round($prevHours + $durationHours, 2);
        $shift           = $attendance->shift;
        $impactIncrement = $this->impact->calculateIncrement($volunteer, $attendance, $shift);
        $newImpact       = min(config('vms.impact_score_max', 100), $volunteer->impact_score + $impactIncrement);

        $volunteer->update([
            'total_hours'  => $newHours,
            'impact_score' => $newImpact,
        ]);

        // Check for newly crossed certificate milestones & dispatch async jobs
        $newMilestones = $this->impact->checkMilestones($volunteer, $prevHours, $newHours);
        foreach ($newMilestones as $milestone) {
            GenerateCertificateJob::dispatch(
                $volunteer->id,
                (float) $milestone,
                $user->org_id ?? $shift->event->org_id
            );
        }

        // Invalidate volunteer profile & impact breakdown caches
        Cache::forget("volunteer_{$volunteer->id}_profile");
        Cache::forget("volunteer_{$volunteer->id}_impact");

        return response()->json([
            'status'  => 'success',
            'message' => 'Check-out completed. Thank you for your service!',
            'data'    => [
                'check_in'         => $checkIn->toDateTimeString(),
                'check_out'        => $checkOut->toDateTimeString(),
                'hours_logged'     => $durationHours,
                'cumulative_hours' => $newHours,
                'impact_score'     => $newImpact,
                'milestones_reached' => $newMilestones,
            ]
        ]);
    }

}

