<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateAnnouncementRequest;
use App\Models\Announcement;
use App\Models\Organization;
use App\Models\Shift;
use App\Notifications\AppNotification;
use App\Services\AuditLogService;
use App\Services\BroadcastService;
use App\Services\Notifier;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private BroadcastService $broadcasts,
        private Notifier $notifier,
        private PlanService $plans,
    ) {}

    /** Urgent alert: delivered right away (bell + optional email) and posted as an announcement. */
    public function broadcastUrgentShift(Request $request, $shiftId)
    {
        $shift = Shift::findForStaffOrFail($shiftId);
        if ($shift->end_time->isPast()) {
            return response()->json(['status' => 'error', 'message' => 'This shift has already ended.'], 422);
        }
        $this->plans->ensureWithinLimit(Organization::findOrFail(auth()->user()->org_id), 'broadcasts_per_month');

        $result = $this->broadcasts->broadcast($shift, auth()->id());
        $this->audit->log('shift.urgent_broadcast', $shift, [], ['event' => $shift->event->title, 'notified' => $result['notified']]);

        return response()->json([
            'status'  => 'success',
            'message' => $result['notified'] > 0
                ? "Urgent alert sent to {$result['notified']} volunteer(s)."
                : 'Alert posted, but no matching volunteers are available at that time.',
            'data'    => [
                'shift_id'   => $shift->id,
                'event'      => $shift->event->title,
                'start_time' => $shift->start_time,
                'notified'   => $result['notified'],
            ],
        ], 202);
    }

    public function createAnnouncement(CreateAnnouncementRequest $request)
    {
        $announcement = Announcement::create([
            'org_id'          => auth()->user()->org_id,
            'posted_by'       => auth()->id(),
            'title'           => $request->title,
            'message'         => $request->message,
            'target_audience' => $request->target_audience,
            'kind'            => 'general',
        ]);

        $audience = $this->broadcasts->announcementAudience($announcement);
        $sent = $this->notifier->send($audience, new AppNotification(
            'announcement',
            $announcement->title,
            mb_strimwidth($announcement->message, 0, 180, '…'),
            null, // resolved per role by the client from `type`
            ['announcement_id' => $announcement->id, 'organization' => auth()->user()->organization?->name],
        ));
        $announcement->update(['recipients_count' => $sent]);

        $this->audit->log('announcement.created', $announcement, [], ['title' => $announcement->title, 'audience' => $announcement->target_audience, 'recipients' => $sent]);

        return response()->json([
            'status'  => 'success',
            'message' => "Announcement posted and delivered to {$sent} people.",
            'data'    => $this->present($announcement->fresh(['author', 'organization']), []),
        ], 201);
    }

    public function deleteAnnouncement($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();
        $this->audit->log('announcement.deleted', $announcement, ['title' => $announcement->title], []);

        return response()->json(['status' => 'success', 'message' => 'Announcement removed.']);
    }

    /**
     * Announcements the signed-in user should see.
     * Volunteers: every organization they are connected to, audience all|volunteers.
     * Staff: their organization, audience all|coordinators (+ their own posts).
     */
    public function getAnnouncements(Request $request)
    {
        $user = auth()->user();
        $query = Announcement::withoutGlobalScopes()->with(['author', 'organization'])->latest();

        if ($user->role === 'Volunteer') {
            $orgIds = $user->volunteer?->engagedOrgIds() ?? [];
            $query->whereIn('org_id', $orgIds ?: [0])->whereIn('target_audience', ['all', 'volunteers']);
        } elseif ($user->role === 'SuperAdmin') {
            // platform view: everything
        } else {
            // Staff see every post of their organization (they manage them).
            $query->where('org_id', $user->org_id);
        }

        $page = $query->paginate(min(50, (int) $request->query('per_page', 20)));
        $read = DB::table('announcement_reads')->where('user_id', $user->id)->whereIn('announcement_id', collect($page->items())->pluck('id'))->pluck('announcement_id')->all();

        return response()->json([
            'status'       => 'success',
            'data'         => collect($page->items())->map(fn ($a) => $this->present($a, $read))->values(),
            'unread_count' => (clone $query)->whereNotIn('id', DB::table('announcement_reads')->where('user_id', $user->id)->select('announcement_id'))->count(),
            'pagination'   => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    public function markRead(Request $request, $id = null)
    {
        $user = auth()->user();
        $ids  = $id ? [(int) $id] : (array) $request->input('ids', []);
        foreach ($ids as $aid) {
            DB::table('announcement_reads')->updateOrInsert(['announcement_id' => $aid, 'user_id' => $user->id], ['read_at' => now()]);
        }
        return response()->json(['status' => 'success']);
    }

    private function present(Announcement $a, array $readIds): array
    {
        return [
            'id'               => $a->id,
            'org_id'           => $a->org_id,
            'organization'     => $a->organization ? ['id' => $a->organization->id, 'name' => $a->organization->name, 'logo_url' => app(\App\Services\FileStore::class)->url($a->organization->logo_path)] : null,
            'posted_by'        => $a->posted_by,
            'poster'           => $a->author ? ['id' => $a->author->id, 'full_name' => $a->author->full_name] : null,
            'title'            => $a->title,
            'message'          => $a->message,
            'target_audience'  => $a->target_audience,
            'kind'             => $a->kind ?? 'general',
            'shift_id'         => $a->shift_id,
            'recipients_count' => (int) $a->recipients_count,
            'is_read'          => in_array($a->id, $readIds, true),
            'created_at'       => $a->created_at->toDateTimeString(),
        ];
    }
}
