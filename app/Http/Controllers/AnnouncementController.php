<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\Announcement;
use App\Models\Volunteer;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Broadcast an urgent shift coverage alert to matching qualified volunteers.
     */
    public function broadcastUrgentShift(Request $request, $shiftId)
    {
        $shift = Shift::with('event')->findOrFail($shiftId);
        $event = $shift->event;

        // Security: Ensure shift belongs to this organization
        if ($event->org_id !== auth()->user()->org_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized action.'
            ], 403);
        }

        // 1. Filter qualified volunteers based on skills alignment
        $requiredSkills = $shift->required_skills ?? [];

        // Fetch all volunteers in this organization
        $volunteers = Volunteer::join('users', 'volunteers.user_id', '=', 'users.id')
            ->where('users.org_id', auth()->user()->org_id)
            ->select('volunteers.*')
            ->get();

        $notifiedVolunteersCount = 0;
        $notifiedNames = [];

        foreach ($volunteers as $vol) {
            $volunteerSkills = $vol->skills ?? [];

            // If shift requires no skills, notify everyone. Otherwise, check overlaps
            if (empty($requiredSkills) || count(array_intersect(
                array_map('strtolower', $volunteerSkills),
                array_map('strtolower', $requiredSkills)
            )) > 0) {
                $notifiedVolunteersCount++;
                $notifiedNames[] = $vol->user->full_name ?? 'Volunteer';
            }
        }

        // 2. Save Announcement Record
        $announcement = Announcement::create([
            'org_id' => auth()->user()->org_id,
            'posted_by' => auth()->user()->id,
            'title' => '🚨 URGENT: Coverage Needed for ' . $event->title,
            'message' => 'We urgently require qualified volunteer coverage for an upcoming shift on ' . $shift->start_time . '. Required Skills: ' . (empty($requiredSkills) ? 'None' : implode(', ', $requiredSkills)) . '.',
            'target_audience' => 'volunteers',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Urgent shift broadcasted successfully.',
            'notified_volunteers_count' => $notifiedVolunteersCount,
            'notified_list' => $notifiedNames,
            'data' => $announcement
        ], 201);
    }

    /**
     * Get announcements.
     */
    public function getAnnouncements()
    {
        $announcements = Announcement::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $announcements
        ]);
    }
}
