<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateVolunteerProfileRequest;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\EventResource;
use App\Http\Resources\ShiftAssignmentResource;
use App\Http\Resources\VolunteerResource;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Shift;
use App\Models\ShiftAssignment;
use App\Services\SkillMatchingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class VolunteerController extends Controller
{
    public function __construct(private SkillMatchingService $skillMatcher) {}
    /**
     * Browse available events with shifts and calculate personalized skill match scores.
     */
    public function browseEvents()
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        $volunteerSkills = $volunteer->skills ?? [];

        // Task 10.2.2.1: Paginated event fetching instead of loading all records
        $events = Event::with('shifts')->paginate(10);

        // Calculate skill match score for each shift using SkillMatchingService
        $events->each(function ($event) use ($volunteerSkills) {
            $event->shifts->each(function ($shift) use ($volunteerSkills) {
                $shift->match_score = $this->skillMatcher->calculateMatchScore(
                    $volunteerSkills,
                    $shift->required_skills ?? []
                );
            });
        });

        return response()->json([
            'status' => 'success',
            'data'   => EventResource::collection($events->items()),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'last_page'    => $events->lastPage(),
                'per_page'     => $events->perPage(),
                'total'        => $events->total(),
            ]
        ]);
    }

    /**
     * Apply for a volunteer shift with automated overlap/conflict detection.
     */
    public function applyForShift($shiftId)
    {
        $shift = Shift::with('event')->findOrFail($shiftId);
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        // 1. Check if already applied/assigned to this specific shift
        $existing = ShiftAssignment::where('shift_id', $shiftId)
            ->where('volunteer_id', $volunteer->id)
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'You have already applied for this shift.'
            ], 422);
        }

        // 2. Automated Shift Timing Conflict Detection
        $overlap = ShiftAssignment::join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
            ->where('shift_assignments.volunteer_id', $volunteer->id)
            ->whereIn('shift_assignments.status', ['pending', 'confirmed'])
            ->where(function ($query) use ($shift) {
                $query->where('shifts.start_time', '<', $shift->end_time)
                      ->where('shifts.end_time', '>', $shift->start_time);
            })
            ->first();

        if ($overlap) {
            return response()->json([
                'status' => 'error',
                'message' => 'Scheduling Conflict: This shift overlaps with another shift you are already scheduled for or have applied to.',
                'conflict_shift_id' => $overlap->shift_id,
            ], 422);
        }

        // 3. Create the Shift Assignment
        $assignment = ShiftAssignment::create([
            'shift_id' => $shift->id,
            'volunteer_id' => $volunteer->id,
            'status' => 'pending',
            'assigned_at' => null,
        ]);

        // Invalidate schedule cache for volunteer
        Cache::forget("volunteer_{$volunteer->id}_schedule");

        return response()->json([
            'status'  => 'success',
            'message' => 'Application submitted successfully. Under coordinator review.',
            'data'    => new ShiftAssignmentResource($assignment)
        ], 201);
    }

    /**
     * Get the logged-in volunteer's scheduled shifts.
     */
    public function getSchedule()
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        $scheduleData = Cache::remember("volunteer_{$volunteer->id}_schedule", 300, function () use ($volunteer) {
            $schedule = ShiftAssignment::where('volunteer_id', $volunteer->id)
                ->with(['shift.event'])
                ->orderBy('created_at', 'desc')
                ->get();
            return ShiftAssignmentResource::collection($schedule);
        });

        return response()->json([
            'status' => 'success',
            'data'   => $scheduleData,
        ]);
    }

    /**
     * Get the authenticated volunteer's full profile details including metrics.
     */
    public function getProfile()
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        $profileData = Cache::remember("volunteer_{$volunteer->id}_profile", 600, function () use ($volunteer) {
            return [
                'volunteer'        => new VolunteerResource($volunteer->load('user')),
                'reliability'      => $volunteer->getReliabilityMetrics(),
                'skills_alignment' => $volunteer->getSkillsAlignment(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data'   => $profileData,
        ]);
    }

    /**
     * Update volunteer profile details (skills, availability, bio, full_name).
     */
    public function updateProfile(UpdateVolunteerProfileRequest $request)
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        if ($request->has('full_name')) {
            $user->update(['full_name' => $request->full_name]);
        }

        $volunteer->update($request->only(['skills', 'availability', 'bio']));

        // Invalidate volunteer profile cache
        Cache::forget("volunteer_{$volunteer->id}_profile");

        return response()->json([
            'status'  => 'success',
            'message' => 'Volunteer profile updated successfully.',
            'data'    => new VolunteerResource($volunteer->fresh('user')),
        ]);
    }

    /**
     * Get all certificates earned by the authenticated volunteer.
     */
    public function getCertificates()
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        $certificates = Certificate::where('volunteer_id', $volunteer->id)
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => CertificateResource::collection($certificates),
        ]);
    }

    /**
     * Get detailed community impact breakdown for the volunteer dashboard.
     */
    public function getImpactBreakdown()
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Volunteer profile not found.'
            ], 404);
        }

        $impactData = Cache::remember("volunteer_{$volunteer->id}_impact", 600, function () use ($volunteer) {
            $completedShiftsCount = \App\Models\Attendance::where('volunteer_id', $volunteer->id)
                ->whereNotNull('check_out_time')
                ->count();

            $milestones = config('vms.certificate_milestones', [10, 25, 50, 100, 200, 500]);
            $currentHours = (float) $volunteer->total_hours;

            $nextMilestone = null;
            foreach ($milestones as $m) {
                if ($m > $currentHours) {
                    $nextMilestone = $m;
                    break;
                }
            }

            $hoursToNextMilestone = $nextMilestone ? round($nextMilestone - $currentHours, 2) : 0.00;

            return [
                'total_hours'            => $currentHours,
                'impact_score'           => (float) $volunteer->impact_score,
                'completed_shifts_count' => $completedShiftsCount,
                'next_milestone'         => $nextMilestone,
                'hours_to_next'          => $hoursToNextMilestone,
                'earned_certificates'    => Certificate::where('volunteer_id', $volunteer->id)->count(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data'   => $impactData,
        ]);
    }

    /**
     * Withdraw a pending shift application.
     */
    public function withdrawApplication($assignmentId)
    {
        $user = Auth::user();
        $volunteer = $user->volunteer;

        $assignment = ShiftAssignment::where('id', $assignmentId)
            ->where('volunteer_id', $volunteer->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $assignment->delete();

        // Invalidate volunteer schedule cache
        Cache::forget("volunteer_{$volunteer->id}_schedule");

        return response()->json([
            'status'  => 'success',
            'message' => 'Shift application withdrawn successfully.',
        ]);
    }
}
