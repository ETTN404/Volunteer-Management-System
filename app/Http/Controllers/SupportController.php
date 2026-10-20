<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SupportMessage;
use App\Models\SupportThread;
use App\Notifications\AppNotification;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Platform ↔ organization messaging (#45).
 * SuperAdmins start threads with one organization or broadcast a notice to many;
 * org admins open threads with the platform team. Both sides reply in place.
 */
class SupportController extends Controller
{
    public function __construct(private Notifier $notifier) {}

    private function side(): string
    {
        return auth()->user()->role === 'SuperAdmin' ? 'platform' : 'org';
    }

    private function scoped()
    {
        $q = SupportThread::query()->with('organization');
        return $this->side() === 'platform' ? $q : $q->where('org_id', auth()->user()->org_id);
    }

    private function present(SupportThread $t, bool $withMessages = false): array
    {
        $last = $t->messages()->latest('id')->first();
        $out = [
            'id'              => $t->id,
            'org_id'          => $t->org_id,
            'organization'    => ['id' => $t->organization?->id, 'name' => $t->organization?->name],
            'subject'         => $t->subject,
            'status'          => $t->status,
            'started_by'      => $t->started_by_side,
            'unread'          => $this->side() === 'platform' ? $t->unread_platform : $t->unread_org,
            'last_message'    => $last ? mb_strimwidth($last->body, 0, 140, '…') : null,
            'last_message_at' => $t->last_message_at?->toIso8601String(),
            'created_at'      => $t->created_at->toIso8601String(),
        ];
        if ($withMessages) {
            $out['messages'] = $t->messages()->with('author')->get()->map(fn (SupportMessage $m) => [
                'id'         => $m->id,
                'side'       => $m->side,
                'author'     => $m->author ? ['id' => $m->author->id, 'name' => $m->author->full_name, 'role' => $m->author->role] : null,
                'body'       => $m->body,
                'mine'       => $m->user_id === auth()->id(),
                'created_at' => $m->created_at->toIso8601String(),
            ])->values();
        }
        return $out;
    }

    public function index(Request $request)
    {
        $q = $this->scoped()->orderByDesc('last_message_at');
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('org_id') && $this->side() === 'platform') {
            $q->where('org_id', (int) $request->org_id);
        }
        $threads = $q->limit(200)->get();

        return response()->json([
            'status'       => 'success',
            'data'         => $threads->map(fn ($t) => $this->present($t))->values(),
            'unread_count' => $threads->filter(fn ($t) => $this->side() === 'platform' ? $t->unread_platform : $t->unread_org)->count(),
        ]);
    }

    public function show($id)
    {
        $thread = $this->scoped()->findOrFail($id);
        $thread->update([$this->side() === 'platform' ? 'unread_platform' : 'unread_org' => false]);

        return response()->json(['status' => 'success', 'data' => $this->present($thread->fresh('organization'), true)]);
    }

    /**
     * Platform: { subject, body, org_ids: [..] | all: true } — one thread per organization.
     * Org admin: { subject, body } — a thread with the platform team.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'subject'   => 'required|string|max:150',
            'body'      => 'required|string|max:5000',
            'org_ids'   => 'sometimes|array|max:500',
            'org_ids.*' => 'integer',
            'all'       => 'sometimes|boolean',
        ]);

        if ($this->side() === 'org') {
            $orgIds = [auth()->user()->org_id];
        } elseif (!empty($data['all'])) {
            $orgIds = Organization::where('status', '!=', 'suspended')->pluck('id')->all();
        } else {
            $orgIds = Organization::whereIn('id', $data['org_ids'] ?? [])->pluck('id')->all();
        }
        if (!$orgIds) {
            return response()->json(['message' => 'Choose at least one organization.', 'errors' => ['org_ids' => ['Required.']]], 422);
        }

        $created = DB::transaction(function () use ($orgIds, $data) {
            $out = [];
            foreach ($orgIds as $orgId) {
                $thread = SupportThread::create([
                    'org_id'          => $orgId,
                    'subject'         => $data['subject'],
                    'status'          => 'open',
                    'started_by_side' => $this->side(),
                    'created_by'      => auth()->id(),
                    'unread_platform' => $this->side() === 'org',
                    'unread_org'      => $this->side() === 'platform',
                    'last_message_at' => now(),
                ]);
                SupportMessage::create(['thread_id' => $thread->id, 'user_id' => auth()->id(), 'side' => $this->side(), 'body' => $data['body']]);
                $out[] = $thread;
            }
            return $out;
        });

        foreach ($created as $thread) {
            $this->notifyOtherSide($thread, $data['body']);
        }

        return response()->json([
            'status'  => 'success',
            'message' => count($created) > 1 ? 'Message sent to ' . count($created) . ' organizations.' : 'Message sent.',
            'data'    => count($created) === 1 ? $this->present($created[0]->fresh('organization'), true) : ['threads' => count($created)],
        ], 201);
    }

    public function reply(Request $request, $id)
    {
        $data   = $request->validate(['body' => 'required|string|max:5000']);
        $thread = $this->scoped()->findOrFail($id);

        SupportMessage::create(['thread_id' => $thread->id, 'user_id' => auth()->id(), 'side' => $this->side(), 'body' => $data['body']]);
        $thread->update([
            'status'          => 'open',
            'last_message_at' => now(),
            'unread_platform' => $this->side() === 'org',
            'unread_org'      => $this->side() === 'platform',
        ]);
        $this->notifyOtherSide($thread, $data['body']);

        return response()->json(['status' => 'success', 'data' => $this->present($thread->fresh('organization'), true)], 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $data   = $request->validate(['status' => 'required|in:open,closed']);
        $thread = $this->scoped()->findOrFail($id);
        $thread->update($data);

        return response()->json(['status' => 'success', 'data' => $this->present($thread->fresh('organization'))]);
    }

    private function notifyOtherSide(SupportThread $thread, string $body): void
    {
        if ($this->side() === 'platform') {
            $users = $this->notifier->orgAdmins($thread->org_id);
            $url   = '/o/messages/' . $thread->id;
            $title = 'Message from VolunTrack: ' . $thread->subject;
        } else {
            $users = $this->notifier->superAdmins();
            $url   = '/p/messages/' . $thread->id;
            $title = ($thread->organization?->name ?? 'An organization') . ': ' . $thread->subject;
        }
        $this->notifier->send($users, new AppNotification('support_message', $title, mb_strimwidth($body, 0, 160, '…'), $url, ['thread_id' => $thread->id]));
    }
}
