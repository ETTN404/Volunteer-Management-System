<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Http\Resources\ChatbotResponseResource;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\ShiftAssignment;
use App\Services\GeminiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

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
    public function chat(ChatRequest $request)
    {

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

        // 2. Format Context Payload as a compressed JSON block to minimize token usage
        $currentTime = now()->format('Y-m-d H:i:s T');
        $contextData = [
            'server_time' => $currentTime, // Dynamic time-context injection
            'volunteer' => [
                'name' => $user->full_name,
                'email' => $user->email,
                'skills' => empty($skills) ? [] : $skills,
                'hours' => $volunteer->total_hours,
                'score' => $volunteer->impact_score,
            ],
            'upcoming_shifts' => $upcomingShifts->map(function($u) {
                return ['event' => $u->event_title, 'loc' => $u->location, 'start' => $u->start_time, 'end' => $u->end_time];
            })->toArray(),
            'past_shifts' => $pastShifts->map(function($p) {
                return ['event' => $p->event_title, 'in' => $p->check_in_time, 'out' => $p->check_out_time];
            })->toArray(),
            'announcements' => $announcements->map(function($a) {
                return ['title' => $a->title, 'msg' => $a->message];
            })->toArray(),
        ];

        $context = "SYSTEM_INSTRUCTION: You are VolunBot, the VMS AI assistant. RULES: 1. Answer concisely. 2. Base all answers strictly on the CONTEXT_JSON. Do not hallucinate dates/events. 3. Detect the user's prompt language and respond in the exact same language (e.g. Amharic, English). 4. Use localized date formatting. Current Server Time: {$currentTime}. CONTEXT_JSON=" . json_encode($contextData);

        // 3. Query the Gemini Service with compiled context and Cache memory
        $cacheKey = 'chat_session_' . $volunteer->id;
        $history = Cache::get($cacheKey, []);
        
        // Discard frontend history and strictly use server-side memory
        $aiMessage = $this->gemini->ask($request->message, $context, $history);

        // 4. Update History in Cache (Maintain last 10 interactions = 20 total messages)
        $history[] = ['role' => 'user', 'parts' => [['text' => $request->message]]];
        $history[] = ['role' => 'model', 'parts' => [['text' => $aiMessage]]];
        
        if (count($history) > 20) {
            $history = array_slice($history, -20);
        }
        
        // Cache for 2 hours (7200 seconds)
        Cache::put($cacheKey, $history, 7200);

        return new ChatbotResponseResource([
            'query'    => $request->message,
            'response' => $aiMessage,
        ]);
    }
}
