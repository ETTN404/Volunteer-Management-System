<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApproveApplicationRequest;
use App\Http\Requests\CreateEventRequest;
use App\Http\Requests\CreateShiftRequest;
use App\Http\Requests\ForceCheckInRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use Carbon\Carbon;

class CoordinatorController extends Controller
{
    public function createEvent(CreateEventRequest $request)
    {
        $event = Event::create([
            'org_id'          => auth()->user()->org_id,
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

        return response()->json([
            'status'  => 'success',
            'message' => 'Event created successfully.',
            'data'    => new EventResource($event),
        ], 201);
    }

    public function getEvents()
    {
        // TenantScope automatically scopes queries by org_id for non-SuperAdmins
        $events = Event::with('shifts')->latest()->paginate(config('vms.events_per_page', 15));

        return response()->json([
            'status' => 'success',
            'data'   => EventResource::collection($events->items()),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'last_page'    => $events->lastPage(),
                'per_page'     => $events->perPage(),
                'total'        => $events->total(),
            ],
        ]);
    }

    public function createShift(CreateShiftRequest $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        // Validate shift dates fall within event dates
        $shiftStart = Carbon::parse($request->start_time)->toDateString();
        $shiftEnd   = Carbon::parse($request->end_time)->toDateString();

        if ($shiftStart < $event->start_date->toDateString() || $shiftEnd > $event->end_date->toDateString()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Shift timings must fall within the event boundaries (' . $event->start_date->toDateString() . ' to ' . $event->end_date->toDateString() . ').'
            ], 422);
        }

        $expiryMinutes = config('vms.qr_expiry_minutes', 15);
        $shift = Shift::create([
            'event_id'          => $event->id,
            'start_time'        => $request->start_time,
            'end_time'          => $request->end_time,
            'required_skills'   => $request->required_skills ?? [],
            'capacity'          => $request->capacity,
            'qr_code_signature' => bin2hex(random_bytes(16)),
            'qr_expires_at'     => now()->addMinutes($expiryMinutes),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Shift created successfully.',
            'data'    => $shift,
        ], 201);
    }

    /**
     * List all applications for a specific event.
     */
    public function getApplications($eventId)
    {
        $event = Event::findOrFail($eventId);

        $assignments = ShiftAssignment::whereIn('shift_id', $event->shifts->pluck('id'))
            ->with(['shift', 'volunteer.user'])
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $assignments
        ]);
    }

    /**
     * Approve or reject a volunteer shift assignment.
     */
    public function approveApplication(ApproveApplicationRequest $request, $assignmentId)
    {
        $assignment = ShiftAssignment::with('shift')->findOrFail($assignmentId);

        // Security check: Make sure this assignment belongs to an event of this organization
        if ($assignment->shift->event->org_id !== auth()->user()->org_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized action.'
            ], 403);
        }

        if ($request->status === 'confirmed') {
            // Check shift capacity limits
            $confirmedCount = ShiftAssignment::where('shift_id', $assignment->shift_id)
                ->where('status', 'confirmed')
                ->count();

            if ($confirmedCount >= $assignment->shift->capacity) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Shift capacity has already been reached.'
                ], 422);
            }
        }

        $assignment->update([
            'status' => $request->status,
            'assigned_at' => $request->status === 'confirmed' ? now() : null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Application status updated to ' . $request->status . '.',
            'data' => $assignment
        ]);
    }

    /**
     * AI-Drafted constructive feedback sugestions for applicants based on skills matching.
     */
    public function getAiFeedback($assignmentId)
    {
        $assignment = ShiftAssignment::with(['shift.event', 'volunteer.user'])->findOrFail($assignmentId);
        $volunteer = $assignment->volunteer;
        $user = $volunteer->user;
        $shift = $assignment->shift;

        $requiredSkills = array_map('strtolower', $shift->required_skills ?? []);
        $volunteerSkills = array_map('strtolower', $volunteer->skills ?? []);

        // Find missing required skills
        $missingSkills = array_diff($requiredSkills, $volunteerSkills);

        if (empty($requiredSkills)) {
            $feedback = "Hi {$user->full_name}, thank you so much for applying to this shift! We do not require any specific skills for this shift, and we would love to have you onboard. We look forward to seeing you soon!";
        } elseif (empty($missingSkills)) {
            $feedback = "Hi {$user->full_name}, your profile has a perfect 100% skills alignment for this shift! We have confirmed your skills and credentials. We are excited to work with you on {$shift->start_time}!";
        } else {
            $feedback = "Hi {$user->full_name}, we'd love to have you onboard, but we need an updated certificate or experience verification for: " . implode(', ', array_map('ucfirst', $missingSkills)) . " before shift approval. Could you upload the latest copy?";
        }

        return response()->json([
            'status' => 'success',
            'assignment_id' => $assignmentId,
            'missing_skills' => array_values($missingSkills),
            'ai_drafted_feedback' => $feedback
        ]);
    }

    /**
     * Force manual check-in override with drawn signature verification capture.
     */
    public function forceCheckIn(ForceCheckInRequest $request, $assignmentId)
    {
        $assignment = ShiftAssignment::with('shift')->findOrFail($assignmentId);
        $volunteer = $assignment->volunteer;

        // Security check
        if ($assignment->shift->event->org_id !== auth()->user()->org_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized action.'
            ], 403);
        }

        // Check if already checked in
        $existing = \App\Models\Attendance::where('shift_id', $assignment->shift_id)
            ->where('volunteer_id', $volunteer->id)
            ->whereNull('check_out_time')
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer is already checked in to this shift.'
            ], 422);
        }

        // Record Manual Attendance override
        $attendance = \App\Models\Attendance::create([
            'shift_id' => $assignment->shift_id,
            'volunteer_id' => $volunteer->id,
            'check_in_time' => now(),
            'qr_verified' => false, // false because it is manual coordinator override bypass!
            'signature_data' => $request->signature_data,
            'latitude' => null,
            'longitude' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Coordinator Override Check-in completed. Hand-drawn signature captured.',
            'data' => $attendance
        ], 201);
    }
}
