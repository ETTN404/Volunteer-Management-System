<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Jobs\SendShiftAlertJob;
use App\Models\Announcement;
use App\Models\Shift;
use App\Models\Volunteer;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AnnouncementController extends Controller
{
    public function __construct(private AuditLogService $audit) {}
    public function broadcastUrgentShift(Request $request, $shiftId)
    {
        $shift = Shift::with('event')->findOrFail($shiftId);
        $event = $shift->event;

        // Security: Ensure shift belongs to this organization
        if ($event->org_id !== auth()->user()->org_id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthorized action.'
            ], 403);
        }

        // Dispatch background worker for skill matching & notification broadcast
        SendShiftAlertJob::dispatch(
            $shift->id,
            auth()->user()->org_id,
            auth()->id()
        );

        $this->audit->log('shift.urgent_broadcast', $shift);

        // Invalidate announcements cache
        Cache::forget("org_" . auth()->user()->org_id . "_announcements");

        return response()->json([
            'status'  => 'success',
            'message' => 'Urgent shift broadcast queued successfully in background queue.',
            'data'    => [
                'shift_id'   => $shift->id,
                'event'      => $event->title,
                'start_time' => $shift->start_time,
            ],
        ], 202);
    }

    /**
     * Create a general announcement for organization members.
     */
    public function createAnnouncement(CreateAnnouncementRequest $request)
    {
        $announcement = Announcement::create([
            'org_id'          => auth()->user()->org_id,
            'posted_by'       => auth()->id(),
            'title'           => $request->title,
            'message'         => $request->message,
            'target_audience' => $request->target_audience,
        ]);

        $this->audit->log('announcement.created', $announcement);

        // Invalidate announcements cache
        Cache::forget("org_" . auth()->user()->org_id . "_announcements");

        return response()->json([
            'status'  => 'success',
            'message' => 'Announcement posted successfully.',
            'data'    => new AnnouncementResource($announcement),
        ], 201);
    }

    /**
     * Get announcements for the organization.
     */
    public function getAnnouncements()
    {
        $orgId = auth()->user()->org_id;

        $announcementsData = Cache::remember("org_{$orgId}_announcements", 120, function () use ($orgId) {
            $announcements = Announcement::where('org_id', $orgId)
                ->orderBy('created_at', 'desc')
                ->paginate(config('vms.per_page', 15));

            return [
                'items'      => AnnouncementResource::collection($announcements->items()),
                'pagination' => [
                    'current_page' => $announcements->currentPage(),
                    'last_page'    => $announcements->lastPage(),
                    'per_page'     => $announcements->perPage(),
                    'total'        => $announcements->total(),
                ],
            ];
        });

        return response()->json([
            'status'     => 'success',
            'data'       => $announcementsData['items'],
            'pagination' => $announcementsData['pagination'],
        ]);
    }
}
