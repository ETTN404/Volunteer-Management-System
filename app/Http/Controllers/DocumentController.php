<?php

namespace App\Http\Controllers;

use App\Http\Resources\VolunteerResource;
use App\Models\Organization;
use App\Models\OrganizationDocument;
use App\Models\Volunteer;
use App\Models\VolunteerDocument;
use App\Notifications\AppNotification;
use App\Services\AuditLogService;
use App\Services\FileStore;
use App\Services\Notifier;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

/**
 * G6 — volunteer documents (certifications, ID, parental consent, medical clearance)
 * and organization verification documents (registration papers for the platform team).
 */
class DocumentController extends Controller
{
    public function __construct(
        private FileStore $files,
        private Notifier $notifier,
        private AuditLogService $audit,
        private PlanService $plans,
    ) {}

    private function presentVolunteerDoc(VolunteerDocument $d, bool $withVolunteer = false): array
    {
        return [
            'id'                  => $d->id,
            'volunteer_id'        => $d->volunteer_id,
            'document_type'       => $d->document_type,
            'title'               => $d->title,
            'file_url'            => $this->files->url($d->file_path),
            'mime_type'           => $d->mime_type,
            'file_size_bytes'     => $d->file_size_bytes,
            'verification_status' => $d->verification_status,
            'coordinator_notes'   => $d->coordinator_notes,
            'verified_at'         => $d->verified_at?->toDateTimeString(),
            'created_at'          => $d->created_at->toDateTimeString(),
            'volunteer'           => $withVolunteer && $d->volunteer ? new VolunteerResource($d->volunteer->loadMissing('user')) : null,
        ];
    }

    // ---------------- Volunteer ----------------

    public function myDocuments()
    {
        $docs = VolunteerDocument::where('volunteer_id', Auth::user()->volunteer->id)->latest()->get();
        return response()->json(['status' => 'success', 'data' => $docs->map(fn ($d) => $this->presentVolunteerDoc($d))->values()]);
    }

    public function upload(Request $request)
    {
        $data = $request->validate([
            'file'          => 'required|file|mimes:pdf,png,jpg,jpeg,webp|max:2048',
            'document_type' => 'required|in:' . implode(',', VolunteerDocument::TYPES),
            'title'         => 'required|string|max:150',
        ]);
        $volunteer = Auth::user()->volunteer;
        if (VolunteerDocument::where('volunteer_id', $volunteer->id)->count() >= 30) {
            return response()->json(['status' => 'error', 'message' => 'You can keep up to 30 documents. Delete old ones first.'], 422);
        }

        $doc = VolunteerDocument::create([
            'org_id'              => Auth::user()->org_id,
            'volunteer_id'        => $volunteer->id,
            'document_type'       => $data['document_type'],
            'title'               => $data['title'],
            'file_path'           => $this->files->put($request->file('file'), 'private'),
            'mime_type'           => $request->file('file')->getMimeType(),
            'file_size_bytes'     => $request->file('file')->getSize(),
            'verification_status' => 'pending',
        ]);

        // Tell coordinators of every organization the volunteer works with.
        foreach ($volunteer->engagedOrgIds() as $orgId) {
            $this->notifier->send($this->notifier->staffOf($orgId), new AppNotification(
                'document_uploaded',
                Auth::user()->full_name . ' uploaded a document',
                $doc->title . ' (' . str_replace('_', ' ', $doc->document_type) . ') is waiting for review.',
                '/c/documents',
            ));
        }

        return response()->json(['status' => 'success', 'message' => 'Document uploaded. A coordinator will review it.', 'data' => $this->presentVolunteerDoc($doc)], 201);
    }

    public function destroy($id)
    {
        $doc = VolunteerDocument::where('volunteer_id', Auth::user()->volunteer->id)->findOrFail($id);
        if ($doc->verification_status === 'verified') {
            return response()->json(['status' => 'error', 'message' => 'Verified documents stay on record. Upload a newer version instead.'], 422);
        }
        $this->files->delete($doc->file_path);
        $doc->delete();
        return response()->json(['status' => 'success', 'message' => 'Document deleted.']);
    }

    // ---------------- Coordinator review ----------------

    public function review(Request $request)
    {
        $orgId  = auth()->user()->org_id;
        $status = $request->query('status');

        $docs = VolunteerDocument::whereIn('volunteer_id', Volunteer::query()->engagedWith($orgId)->select('volunteers.id'))
            ->when($status, fn ($q) => $q->where('verification_status', $status))
            ->with('volunteer.user')->latest()->limit(300)->get();

        return response()->json(['status' => 'success', 'data' => $docs->map(fn ($d) => $this->presentVolunteerDoc($d, true))->values()]);
    }

    public function verify(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:verified,rejected',
            'notes'  => 'nullable|string|max:1000|required_if:status,rejected',
        ]);
        $orgId = auth()->user()->org_id;
        $doc = VolunteerDocument::whereIn('volunteer_id', Volunteer::query()->engagedWith($orgId)->select('volunteers.id'))
            ->with('volunteer.user')->findOrFail($id);

        $doc->update([
            'verification_status' => $data['status'],
            'coordinator_notes'   => $data['notes'] ?? null,
            'verified_by'         => auth()->id(),
            'verified_at'         => now(),
        ]);

        if ($doc->document_type === 'parental_consent') {
            $doc->volunteer->update(['parental_consent_verified' => $data['status'] === 'verified']);
        }
        Cache::forget("volunteer_{$doc->volunteer_id}_profile");

        if ($doc->volunteer?->user) {
            $this->notifier->send($doc->volunteer->user, new AppNotification(
                'document_reviewed',
                $doc->title . ($data['status'] === 'verified' ? ' was verified' : ' needs attention'),
                $data['status'] === 'verified' ? 'Thanks — it is now on your verified record.' : ('Reason: ' . ($data['notes'] ?? '—') . '. Upload a corrected copy.'),
                '/v/documents',
            ));
        }
        $this->audit->log('document.' . $data['status'], $doc, [], ['title' => $doc->title, 'volunteer' => $doc->volunteer?->user?->full_name, 'notes' => $data['notes'] ?? null]);

        return response()->json(['status' => 'success', 'data' => $this->presentVolunteerDoc($doc->fresh('volunteer.user'), true)]);
    }

    // ---------------- Organization verification documents ----------------

    public static function presentOrgDoc(OrganizationDocument $d): array
    {
        return [
            'id'            => $d->id,
            'org_id'        => $d->org_id,
            'document_type' => $d->document_type,
            'title'         => $d->title,
            'file_url'      => app(FileStore::class)->url($d->file_path),
            'mime_type'     => $d->mime_type,
            'file_size_bytes' => $d->file_size_bytes,
            'status'        => $d->status,
            'review_notes'  => $d->review_notes,
            'reviewed_at'   => $d->reviewed_at?->toDateTimeString(),
            'created_at'    => $d->created_at->toDateTimeString(),
        ];
    }

    public function orgDocuments()
    {
        $docs = OrganizationDocument::where('org_id', auth()->user()->org_id)->latest()->get();
        return response()->json(['status' => 'success', 'data' => $docs->map(fn ($d) => self::presentOrgDoc($d))->values()]);
    }

    public function uploadOrgDocument(Request $request)
    {
        $data = $request->validate([
            'file'          => 'required|file|mimes:pdf,png,jpg,jpeg|max:5120',
            'document_type' => 'required|in:' . implode(',', OrganizationDocument::TYPES),
            'title'         => 'required|string|max:150',
        ]);
        $org = Organization::findOrFail(auth()->user()->org_id);
        $this->plans->ensureWithinLimit($org, 'storage_mb', (int) ceil($request->file('file')->getSize() / 1048576), (int) ceil($this->plans->usage($org)['storage_mb']));

        $doc = self::storeOrgDocument($org, $request->file('file'), $data['document_type'], $data['title']);
        if ($org->verification_status !== 'verified') {
            $org->update(['verification_status' => 'pending']);
        }

        return response()->json(['status' => 'success', 'message' => 'Document uploaded for platform review.', 'data' => self::presentOrgDoc($doc)], 201);
    }

    public static function storeOrgDocument(Organization $org, $file, string $type, string $title): OrganizationDocument
    {
        $doc = OrganizationDocument::create([
            'org_id'          => $org->id,
            'document_type'   => $type,
            'title'           => $title,
            'file_path'       => app(FileStore::class)->put($file, 'private'),
            'mime_type'       => $file->getMimeType(),
            'file_size_bytes' => $file->getSize(),
            'status'          => 'pending',
        ]);
        $notifier = app(Notifier::class);
        $notifier->send($notifier->superAdmins(), new AppNotification(
            'organization_document',
            $org->name . ' submitted a verification document',
            $title . ' — review it to verify the organization.',
            '/p/organizations/' . $org->id,
        ));
        return $doc;
    }
}
