<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Models\Attendance;
use App\Models\Shift;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    /**
     * Rotating QR for the coordinator's screen. The token changes every
     * `qr_window_seconds` (30 s by default) and a scan is accepted for the current
     * and previous window, so a photo forwarded to someone at home is useless
     * within a minute. POST (legacy) and GET return the same payload.
     */
    public function generateQrCode($shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        $qr    = $this->attendance->qrToken($shift);

        // Keep the legacy static signature in sync for older clients / printed codes.
        $shift->forceFill([
            'qr_code_signature' => $qr['token'],
            'qr_expires_at'     => Carbon::parse($qr['valid_until']),
        ])->save();

        return response()->json([
            'status'            => 'success',
            'qr_code_signature' => $qr['token'],
            'expires_at'        => Carbon::parse($qr['valid_until'])->toDateTimeString(),
            'data'              => $qr,
        ]);
    }

    public function checkIn(CheckInRequest $request)
    {
        $clientTime = Carbon::parse($request->client_timestamp);
        if (abs($clientTime->diffInSeconds(now())) > config('vms.time_drift_tolerance', 2) * 60) {
            return response()->json([
                'status'  => 'error',
                'code'    => 'clock_drift',
                'message' => 'Security Error: High time-drift detected. Ensure your device clock is synced accurately to the network.',
            ], 422);
        }

        $shift      = Shift::with('event.organization')->findOrFail($request->shift_id);
        $attendance = $this->attendance->checkIn(Auth::user()->volunteer, $shift, $request->validated() + [
            'device_id' => $request->header('X-Device-Id'),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Check-in verified successfully. Welcome to your shift!',
            'data'    => $this->attendance->present($attendance),
        ], 201);
    }

    public function checkOut(CheckOutRequest $request)
    {
        $shift      = Shift::with('event.organization')->findOrFail($request->shift_id);
        $attendance = $this->attendance->checkOut(Auth::user()->volunteer, $shift, $request->validated());
        $volunteer  = Auth::user()->volunteer->fresh();

        return response()->json([
            'status'  => 'success',
            'message' => 'Check-out completed. Thank you for your service!',
            'data'    => $this->attendance->present($attendance) + [
                'check_in'         => $attendance->check_in_time->toDateTimeString(),
                'check_out'        => $attendance->check_out_time->toDateTimeString(),
                'hours_logged'     => $attendance->rawHours(),
                'cumulative_hours' => (float) $volunteer->total_hours,
                'impact_score'     => (float) $volunteer->impact_score,
            ],
        ]);
    }

    /** Undo a mistaken check-out. */
    public function resume(Request $request)
    {
        $request->validate(['shift_id' => 'required|integer']);
        $shift      = Shift::with('event.organization')->findOrFail($request->shift_id);
        $attendance = $this->attendance->resume(Auth::user()->volunteer, $shift);

        return response()->json([
            'status'  => 'success',
            'message' => 'You are back on shift.',
            'data'    => $this->attendance->present($attendance),
        ]);
    }

    public function ping(Request $request)
    {
        $data = $request->validate([
            'shift_id'  => 'required|integer',
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'nullable|numeric|min:0|max:100000',
        ]);
        $shift = Shift::with('event.organization')->findOrFail($data['shift_id']);

        return response()->json([
            'status' => 'success',
            'data'   => $this->attendance->ping(Auth::user()->volunteer, $shift, $data),
        ]);
    }

    /** G9 — the volunteer's own attendance history. */
    public function history()
    {
        $this->attendance->sweepIfDue();
        $records = Attendance::where('volunteer_id', Auth::user()->volunteer->id)
            ->with(['shift.event.organization', 'pings'])
            ->latest('check_in_time')->limit(200)->get();

        return response()->json([
            'status' => 'success',
            'data'   => $records->map(fn ($a) => $this->attendance->present($a) + [
                'shift' => $a->shift ? [
                    'id'         => $a->shift->id,
                    'title'      => $a->shift->title,
                    'start_time' => $a->shift->start_time?->toIso8601String(),
                    'end_time'   => $a->shift->end_time?->toIso8601String(),
                    'event'      => $a->shift->event ? [
                        'id'                => $a->shift->event->id,
                        'title'             => $a->shift->event->title,
                        'location'          => $a->shift->event->location,
                        'organization_name' => $a->shift->event->organization?->name,
                    ] : null,
                ] : null,
            ])->values(),
        ]);
    }
}
