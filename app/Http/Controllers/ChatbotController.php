<?php

namespace App\Http\Controllers;

use App\Services\GeminiService;
use App\Models\ShiftAssignment;
use App\Models\Attendance;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatbotController extends Controller
{
    protected GeminiService $gemini;

    public function __construct(GeminiService $gemini)
    {
        $this->gemini = $gemini;
    }

    /**
     * Intercept query, compile real-time database context (RAG), and ask Gemini.
     */
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'nullable|array', // optional conversation history
        ]);

        $user = Auth::user();
        $volunteer = $user->volunteer;

        if (!$volunteer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Chatbot is only available for registered volunteer users.'
            ], 403);
        }

        // 1. Gather Real-Time Contextual Data (Retrieval-Augmented Contextualization)
        $skills = $volunteer->skills ?? [];
        $availability = $volunteer->availability ?? [];
        
        // Fetch upcoming shifts
        $upcomingShifts = ShiftAssignment::join('shifts', 'shift_assignments.shift_id', '=', 'shifts.id')
            ->join('events', 'shifts.event_id', '=', 'events.id')
            ->where('shift_assignments.volunteer_id', $volunteer->id)
            ->where('shift_assignments.status', 'confirmed')
            ->where('shifts.start_time', '>=', now())
            ->select('events.title as event_title', 'events.location', 'shifts.start_time', 'shifts.end_time')
            ->get();

        // Fetch completed attendance history
        $pastShifts = Attendance::join('shifts', 'attendances.shift_id', '=', 'shifts.id')
            ->join('events', 'shifts.event_id', '=', 'events.id')
            ->where('attendances.volunteer_id', $volunteer->id)
            ->whereNotNull('attendances.check_out_time')
            ->select('events.title as event_title', 'attendances.check_in_time', 'attendances.check_out_time')
            ->get();

        // Fetch organization-wide announcements
        $announcements = Announcement::where('org_id', $user->org_id)
            ->whereIn('target_audience', ['all', 'volunteers'])
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get();

        // 2. Format Context Payload as a structured text block
        $context = "You are VolunBot, the highly intelligent and friendly AI assistant for the Volunteer Management System (VMS).\n";
        $context .= "Here is the real-time verified context of the currently logged-in volunteer user:\n";
        $context .= "- Name: " . $user->full_name . "\n";
        $context .= "- Email: " . $user->email . "\n";
        $context .= "- Primary Skills: " . (empty($skills) ? 'None listed' : implode(', ', $skills)) . "\n";
        $context .= "- Total Verified Service Hours: " . $volunteer->total_hours . " hours\n";
        $context .= "- Calculated Impact Score: " . $volunteer->impact_score . "/100\n";
        $context .= "- Bio: " . ($volunteer->bio ?? 'Not provided') . "\n\n";

        $context .= "UPCOMING CONFIRMED SHIFTS SCHEDULED:\n";
        if ($upcomingShifts->isEmpty()) {
            $context .= " - No upcoming shifts scheduled.\n";
        } else {
            foreach ($upcomingShifts as $u) {
                $context .= " - Event: '{$u->event_title}' at Location: '{$u->location}' starting at: '{$u->start_time}' ending at: '{$u->end_time}'\n";
            }
        }
        $context .= "\n";

        $context .= "PAST COMPLETED SERVICE ATTENDANCES:\n";
        if ($pastShifts->isEmpty()) {
            $context .= " - No past shift history in database.\n";
        } else {
            foreach ($pastShifts as $p) {
                $context .= " - Event: '{$p->event_title}' served from '{$p->check_in_time}' to '{$p->check_out_time}'\n";
            }
        }
        $context .= "\n";

        $context .= "ACTIVE ORGANIZATIONAL ANNOUNCEMENTS:\n";
        if ($announcements->isEmpty()) {
            $context .= " - No active announcements.\n";
        } else {
            foreach ($announcements as $a) {
                $context .= " - Title: '{$a->title}' | Content: '{$a->message}' (Posted on {$a->created_at})\n";
            }
        }

        // 3. Query the Gemini Service with compiled context
        $history = $request->history ?? [];
        $aiMessage = $this->gemini->ask($request->message, $context, $history);

        return response()->json([
            'status' => 'success',
            'query' => $request->message,
            'response' => $aiMessage,
        ]);
    }
}
