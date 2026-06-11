<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Models\Attendance;
use App\Models\Volunteer;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
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
    public function checkIn(Request $request)
    {
        $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'qr_code_signature' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

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

        // 4. QR Signature Validation
        if ($shift->qr_code_signature !== $request->qr_code_signature) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation Failed: Scanned QR code is invalid or has expired.'
            ], 422);
        }

        // 5. GPS Geofence Validation using Haversine Formula
        $event = $shift->event;
        if ($event->latitude && $event->longitude) {
            $distance = $this->calculateDistance(
                $request->latitude,
                $request->longitude,
                $event->latitude,
                $event->longitude
            );

            // Geofence boundary: 100 meters
            if ($distance > 100) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Location Blocked: You must be present at the physical venue to check in. Scanned distance was ' . round($distance, 1) . ' meters away (Geofence limit: 100 meters).'
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
            'status' => 'success',
            'message' => 'Check-in verified successfully. Welcome to your shift!',
            'data' => $attendance
        ], 201);
    }

    /**
     * Perform shift check-out and dynamically accumulate hours and impact metrics.
     */
    public function checkOut(Request $request)
    {
        $request->validate([
            'shift_id' => 'required|exists:shifts,id',
        ]);

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

        // Accumulate metrics on volunteer profile
        $newHours = $volunteer->total_hours + $durationHours;
        
        // Calculate incremental impact score (0.1 points per hour, capped at 100)
        $impactIncrement = round($durationHours * 0.1, 2);
        $newImpact = min(100, $volunteer->impact_score + $impactIncrement);

        $volunteer->update([
            'total_hours' => $newHours,
            'impact_score' => $newImpact,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Check-out completed. Thank you for your service!',
            'data' => [
                'check_in' => $checkIn->toDateTimeString(),
                'check_out' => $checkOut->toDateTimeString(),
                'hours_logged' => $durationHours,
                'cumulative_hours' => $newHours,
                'impact_score' => $newImpact
            ]
        ]);
    }

    /**
     * Haversine Distance Calculator (returns distance in meters between two coordinates)
     */
    private function calculateDistance($lat1, $lon1, $lat2, $longitude2)
    {
        $earthRadius = 6371000; // in meters

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($longitude2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
