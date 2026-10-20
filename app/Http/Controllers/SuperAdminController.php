<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Organization;
use App\Models\OrganizationDocument;
use App\Models\OrganizationReport;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\AppNotification;
use App\Notifications\OrganizationSuspendedNotification;
use App\Services\AuditLogService;
use App\Services\AuditPresenter;
use App\Services\InvitationService;
use App\Services\Notifier;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SuperAdminController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private PlanService $plans,
        private Notifier $notifier,
        private InvitationService $invitations,
    ) {}

    private function pagination($p): array
    {
        return ['current_page' => $p->currentPage(), 'last_page' => $p->lastPage(), 'per_page' => $p->perPage(), 'total' => $p->total()];
    }

    public function dashboardMetrics()
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_organizations'   => Organization::count(),
                'active_organizations'  => Organization::where('status', 'active')->count(),
                'pending_verification'  => Organization::where('verification_status', 'pending')->count(),
                'total_users'           => User::withoutGlobalScopes()->count(),
                'total_volunteers'      => User::withoutGlobalScopes()->where('role', 'Volunteer')->count(),
                'total_coordinators'    => User::withoutGlobalScopes()->where('role', 'Coordinator')->count(),
                'verified_hours'        => round((float) Attendance::whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours'), 1),
                'pending_payments'      => Payment::where('status', 'pending')->count(),
                'revenue_this_month'    => round((float) Payment::where('status', 'verified')->where('reviewed_at', '>=', now()->startOfMonth())->sum('amount'), 2),
                'open_reports'          => OrganizationReport::whereIn('status', ['open', 'reviewing'])->count(),
                'plans'                 => Organization::select('subscription_plan', DB::raw('count(*) as c'))->groupBy('subscription_plan')->pluck('c', 'subscription_plan'),
            ],
        ]);
    }

    /** G23 — 12 monthly points: cumulative organizations & users, hours that month. */
    public function timeseries()
    {
        $start = now()->subMonths(11)->startOfMonth();
        $orgDates  = Organization::withTrashed()->pluck('created_at');
        $userDates = User::withoutGlobalScopes()->pluck('created_at');
        $att = Attendance::where('check_in_time', '>=', $start)->get(['check_in_time', 'check_out_time', 'hours_status', 'verified_hours']);

        $points = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $end   = $month->copy()->endOfMonth();
            $key   = $month->format('Y-m');
            $rows  = $att->filter(fn ($a) => $a->check_in_time?->format('Y-m') === $key);
            $points[] = [
                'date'           => $key,
                'organizations'  => $orgDates->filter(fn ($d) => $d && $d->lte($end))->count(),
                'users'          => $userDates->filter(fn ($d) => $d && $d->lte($end))->count(),
                'new_users'      => $userDates->filter(fn ($d) => $d && $d->format('Y-m') === $key)->count(),
                'hours'          => round($rows->sum(fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : $a->rawHours()), 1),
                'verified_hours' => round($rows->sum(fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : 0), 1),
                'revenue'        => round((float) Payment::where('status', 'verified')->whereBetween('reviewed_at', [$month->copy()->startOfMonth(), $end])->sum('amount'), 2),
            ];
        }

        return response()->json(['status' => 'success', 'data' => $points]);
    }

    // ------------------------------------------------------------------
    // Organizations
    // ------------------------------------------------------------------

    public function listOrganizations(Request $request)
    {
        $q = Organization::query()->withCount(['users', 'events'])->latest();
        foreach (['status', 'verification_status', 'subscription_plan'] as $f) {
            if ($request->filled($f)) {
                $q->where($f, $request->input($f));
            }
        }
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('city', 'like', "%$s%"));
        }
        $orgs = $q->paginate(min(100, (int) $request->query('per_page', 25)));

        return response()->json([
            'status'     => 'success',
            'data'       => collect($orgs->items())->map(fn ($o) => (new OrganizationResource($o))->resolve() + [
                'user_count'  => $o->users_count,
                'event_count' => $o->events_count,
            ])->values(),
            'pagination' => $this->pagination($orgs),
        ]);
    }

    public function showOrganization($id)
    {
        $organization = Organization::withCount(['users', 'events'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'organization' => new OrganizationResource($organization),
                'user_count'   => $organization->users_count,
                'event_count'  => $organization->events_count,
                'billing'      => $this->plans->snapshot($organization),
                'admins'       => UserResource::collection(User::withoutGlobalScopes()->where('org_id', $organization->id)->where('role', 'OrgAdmin')->get()),
                'documents'    => OrganizationDocument::where('org_id', $organization->id)->latest()->get()->map(fn ($d) => DocumentController::presentOrgDoc($d))->values(),
                'payments'     => Payment::where('org_id', $organization->id)->latest()->limit(20)->get()->map(fn ($p) => OrgAdminController::presentPayment($p))->values(),
                'reports'      => OrganizationReport::where('org_id', $organization->id)->latest()->limit(20)->get()->map(fn ($r) => $this->presentReport($r))->values(),
                'stats'        => [
                    'volunteers'     => \App\Models\Volunteer::query()->engagedWith($organization->id)->count(),
                    'verified_hours' => round((float) Attendance::whereIn('shift_id', \App\Models\Shift::query()->forOrg($organization->id)->select('shifts.id'))
                        ->whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours'), 1),
                    'last_activity'  => User::withoutGlobalScopes()->where('org_id', $organization->id)->max('last_login'),
                ],
            ],
        ]);
    }

    /**
     * Status (active | suspended | inactive), plan and plan expiry.
     * suspended = blocked for a violation; inactive = dormant / closed. Both hide
     * the organization from volunteers and block staff sign-in.
     */
    public function updateOrganizationStatus(Request $request, $id)
    {
        $data = $request->validate([
            'status'            => 'sometimes|in:' . implode(',', Organization::STATUSES),
            'subscription_plan' => 'sometimes|in:free,pro,enterprise',
            'plan_expires_at'   => 'sometimes|nullable|date',
            'reason'            => 'nullable|string|max:500',
        ]);

        $organization = Organization::findOrFail($id);
        $oldData      = $organization->only(['status', 'subscription_plan', 'plan_expires_at']);
        $organization->update(array_intersect_key($data, array_flip(['status', 'subscription_plan', 'plan_expires_at'])));

        $statusChanged = isset($data['status']) && $data['status'] !== $oldData['status'];
        if ($statusChanged && in_array($data['status'], ['suspended', 'inactive'], true)) {
            $admins = $this->notifier->orgAdmins($organization->id);
            if ($data['status'] === 'suspended') {
                $this->notifier->send($admins, new OrganizationSuspendedNotification($organization));
            } else {
                $this->notifier->send($admins, new AppNotification('organization_inactive', 'Your organization was marked inactive',
                    $data['reason'] ?? 'Contact the platform team to reactivate it.', null));
            }
            // Staff tokens stop working on their next request (TenantMiddleware); volunteers keep their accounts.
        } elseif ($statusChanged && $data['status'] === 'active') {
            $this->notifier->send($this->notifier->orgAdmins($organization->id), new AppNotification(
                'organization_active', 'Your organization is active again', 'Volunteers can see your events and apply.', '/o'));
        }

        $this->audit->log(
            'tenant.status_updated',
            $organization,
            array_merge($oldData, ['org_name' => $organization->name]),
            array_merge($organization->fresh()->only(['status', 'subscription_plan', 'plan_expires_at']), ['org_name' => $organization->name, 'reason' => $data['reason'] ?? null])
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Organization updated.',
            'data'    => new OrganizationResource($organization->fresh()),
        ]);
    }

    /** Approve or reject an organization's verification (documents). */
    public function reviewVerification(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:verified,rejected,pending',
            'notes'  => 'nullable|string|max:1000|required_if:status,rejected',
        ]);
        $org = Organization::findOrFail($id);
        $old = $org->verification_status;
        $org->update(['verification_status' => $data['status'], 'verified_at' => $data['status'] === 'verified' ? now() : null]);

        OrganizationDocument::where('org_id', $org->id)->where('status', 'pending')->update([
            'status' => $data['status'] === 'verified' ? 'verified' : ($data['status'] === 'rejected' ? 'rejected' : 'pending'),
            'review_notes' => $data['notes'] ?? null, 'reviewed_by' => auth()->id(), 'reviewed_at' => now(),
        ]);

        $this->notifier->send($this->notifier->orgAdmins($org->id), new AppNotification(
            'organization_verification',
            $data['status'] === 'verified' ? 'Your organization is verified' : 'Verification needs attention',
            $data['status'] === 'verified'
                ? 'Volunteers can now discover your events and apply.'
                : 'Reason: ' . ($data['notes'] ?? '—') . '. Upload corrected documents from Settings.',
            '/o/settings',
        ));
        $this->audit->log('tenant.verification_updated', $org, ['verification_status' => $old, 'org_name' => $org->name], ['verification_status' => $data['status'], 'org_name' => $org->name, 'notes' => $data['notes'] ?? null]);

        return response()->json(['status' => 'success', 'data' => new OrganizationResource($org->fresh())]);
    }

    public function reviewOrgDocument(Request $request, $docId)
    {
        $data = $request->validate(['status' => 'required|in:verified,rejected', 'notes' => 'nullable|string|max:1000']);
        $doc = OrganizationDocument::findOrFail($docId);
        $doc->update(['status' => $data['status'], 'review_notes' => $data['notes'] ?? null, 'reviewed_by' => auth()->id(), 'reviewed_at' => now()]);

        return response()->json(['status' => 'success', 'data' => DocumentController::presentOrgDoc($doc)]);
    }

    // ------------------------------------------------------------------
    // People (G22, G24)
    // ------------------------------------------------------------------

    public function listAdmins(Request $request)
    {
        $q = User::withoutGlobalScopes()->where('role', 'OrgAdmin')->with('organization')->latest();
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('full_name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"));
        }
        $page = $q->paginate(min(100, (int) $request->query('per_page', 50)));

        return response()->json([
            'status'     => 'success',
            'data'       => collect($page->items())->map(fn ($u) => (new UserResource($u))->resolve() + ['invitation_pending' => (bool) $u->must_change_password])->values(),
            'pagination' => $this->pagination($page),
        ]);
    }

    public function toggleAdminStatus($id)
    {
        $user = User::withoutGlobalScopes()->whereIn('role', ['OrgAdmin', 'Coordinator', 'Volunteer'])->findOrFail($id);
        $active = !($user->is_active ?? true);
        $user->update(['is_active' => $active]);
        if (!$active) {
            $user->tokens()->delete();
        }
        $this->audit->log($active ? 'user.activated' : 'user.deactivated', $user, [], ['full_name' => $user->full_name]);

        return response()->json(['status' => 'success', 'message' => $active ? 'Account reactivated.' : 'Account deactivated.', 'is_active' => $active]);
    }

    public function resendInvite($id)
    {
        $user = User::withoutGlobalScopes()->whereIn('role', ['OrgAdmin', 'Coordinator'])->findOrFail($id);
        if (!$user->must_change_password) {
            return response()->json(['status' => 'error', 'message' => 'This person already set their password.'], 422);
        }
        $invite = $this->invitations->issue($user, auth()->user());
        $this->audit->log('user.invitation_resent', $user, [], ['full_name' => $user->full_name]);

        return response()->json(['status' => 'success', 'message' => 'A new invitation was sent to ' . $user->email . '.', 'invitation' => $invite]);
    }

    public function listUsers(Request $request)
    {
        $q = User::withoutGlobalScopes()->with('organization')->latest();
        if ($role = $request->query('role')) {
            $q->where('role', $role);
        }
        if ($request->filled('org_id')) {
            $q->where('org_id', (int) $request->org_id);
        }
        if ($request->filled('active')) {
            $q->where('is_active', $request->boolean('active'));
        }
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('full_name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")->orWhere('phone', 'like', "%$s%"));
        }
        $page = $q->paginate(min(100, (int) $request->query('per_page', 50)));

        return response()->json([
            'status'     => 'success',
            'data'       => UserResource::collection($page->items()),
            'pagination' => $this->pagination($page),
        ]);
    }

    // ------------------------------------------------------------------
    // Audit
    // ------------------------------------------------------------------

    public function listAuditLogs(Request $request, AuditPresenter $presenter)
    {
        if ($request->query('format') === 'csv') {
            $rows = $presenter->present($presenter->query($request)->limit(10000)->get());
            return response($presenter->csv($rows), 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="audit-trail-' . now()->toDateString() . '.csv"',
            ]);
        }

        $page = $presenter->query($request)->paginate(min(200, (int) $request->query('per_page', 50)));

        return response()->json([
            'status'     => 'success',
            'data'       => $presenter->present(collect($page->items())),
            'pagination' => $this->pagination($page),
        ]);
    }

    // ------------------------------------------------------------------
    // Payments
    // ------------------------------------------------------------------

    public function listPayments(Request $request)
    {
        $q = Payment::with(['organization', 'submitter'])->latest();
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($s = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('transaction_ref', 'like', "%$s%")->orWhereHas('organization', fn ($o) => $o->where('name', 'like', "%$s%")));
        }
        $page = $q->paginate(min(100, (int) $request->query('per_page', 25)));

        return response()->json([
            'status'     => 'success',
            'data'       => collect($page->items())->map(fn ($p) => OrgAdminController::presentPayment($p))->values(),
            'pagination' => $this->pagination($page),
        ]);
    }

    public function paymentSummary()
    {
        $verified = Payment::where('status', 'verified');
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $months[] = [
                'month'   => $m->format('Y-m'),
                'revenue' => round((float) (clone $verified)->whereBetween('reviewed_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->sum('amount'), 2),
                'count'   => (clone $verified)->whereBetween('reviewed_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->count(),
            ];
        }
        $paying = Organization::whereIn('subscription_plan', ['pro', 'enterprise'])->where('plan_expires_at', '>', now())->get();
        $mrr = $paying->sum(fn ($o) => (float) config("plans.plans.{$o->subscription_plan}.price_monthly", 0));

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_revenue'       => round((float) (clone $verified)->sum('amount'), 2),
                'revenue_this_month'  => end($months)['revenue'],
                'mrr'                 => round($mrr, 2),
                'paying_organizations'=> $paying->count(),
                'pending_count'       => Payment::where('status', 'pending')->count(),
                'pending_amount'      => round((float) Payment::where('status', 'pending')->sum('amount'), 2),
                'rejected_count'      => Payment::where('status', 'rejected')->count(),
                'auto_verified_share' => ($total = (clone $verified)->count()) ? round((clone $verified)->whereNull('reviewed_by')->count() / $total * 100, 1) : null,
                'by_method'           => Payment::where('status', 'verified')->select('method', DB::raw('count(*) as count'), DB::raw('sum(amount) as amount'))->groupBy('method')->get(),
                'by_plan'             => Payment::where('status', 'verified')->select('plan', DB::raw('count(*) as count'), DB::raw('sum(amount) as amount'))->groupBy('plan')->get(),
                'months'              => $months,
                'expiring_soon'       => Organization::whereIn('subscription_plan', ['pro', 'enterprise'])->whereBetween('plan_expires_at', [now(), now()->addDays(14)])
                    ->get(['id', 'name', 'subscription_plan', 'plan_expires_at']),
            ],
        ]);
    }

    public function reviewPayment(Request $request, $id)
    {
        $data = $request->validate(['status' => 'required|in:verified,rejected', 'notes' => 'nullable|string|max:1000|required_if:status,rejected']);
        $payment = Payment::with('organization')->findOrFail($id);
        if ($payment->status === 'verified') {
            return response()->json(['status' => 'error', 'message' => 'This payment is already confirmed.'], 422);
        }

        if ($data['status'] === 'verified') {
            OrgAdminController::activate($payment, auth()->user());
            $payment->update(['notes' => $data['notes'] ?? null]);
        } else {
            $payment->update(['status' => 'rejected', 'notes' => $data['notes'], 'reviewed_by' => auth()->id(), 'reviewed_at' => now()]);
            $this->notifier->send($this->notifier->orgAdmins($payment->org_id), new AppNotification(
                'payment_rejected', 'Payment not accepted', 'Reference ' . $payment->transaction_ref . ': ' . $data['notes'], '/o/billing'));
        }
        $this->audit->log('payment.' . $data['status'], $payment, [], ['org_name' => $payment->organization?->name, 'amount' => (float) $payment->amount, 'ref' => $payment->transaction_ref]);

        return response()->json(['status' => 'success', 'data' => OrgAdminController::presentPayment($payment->fresh(['organization', 'submitter']))]);
    }

    public function retryPaymentVerification($id, \App\Services\PaymentVerifier $verifier)
    {
        $payment = Payment::with('organization')->where('status', 'pending')->findOrFail($id);
        $result  = $verifier->verify($payment);
        $payment->update([
            'verification_source'   => $result['source'],
            'verification_response' => ['reason' => $result['reason'], 'attempts' => $result['attempts'], 'receipt' => $result['receipt'] ? array_diff_key($result['receipt'], ['raw' => 1]) : null],
        ]);
        if ($result['outcome'] === 'verified') {
            OrgAdminController::activate($payment, null);
        }

        return response()->json(['status' => 'success', 'message' => $result['reason'], 'data' => OrgAdminController::presentPayment($payment->fresh(['organization', 'submitter']))]);
    }

    // ------------------------------------------------------------------
    // Health
    // ------------------------------------------------------------------

    public function health()
    {
        $checks = [];

        $t = microtime(true);
        try {
            DB::select('select 1');
            $checks['database'] = ['ok' => true, 'latency_ms' => (int) ((microtime(true) - $t) * 1000), 'driver' => DB::getDriverName()];
        } catch (\Throwable $e) {
            $checks['database'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        try {
            Cache::put('health.ping', 1, 10);
            $checks['cache'] = ['ok' => Cache::get('health.ping') === 1, 'driver' => config('cache.default')];
        } catch (\Throwable $e) {
            $checks['cache'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        $checks['queue'] = ['ok' => true, 'driver' => config('queue.default'),
            'failed_jobs' => DB::getSchemaBuilder()->hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null];
        $checks['mail'] = ['ok' => !in_array(config('mail.default'), ['log', 'array'], true), 'driver' => config('mail.default'),
            'note' => in_array(config('mail.default'), ['log', 'array'], true) ? 'Emails are written to the log, not delivered. Set MAIL_MAILER=smtp.' : null];
        $checks['frontend_url'] = ['ok' => (bool) config('vms.frontend_url'), 'value' => config('vms.frontend_url'),
            'note' => config('vms.frontend_url') ? null : 'Set FRONTEND_URL so email links always point to the app.'];

        $sweep = DB::table('system_settings')->where('key', 'sweep.last')->value('value');
        $checks['maintenance'] = ['ok' => $sweep && now()->diffInMinutes(\Carbon\Carbon::parse($sweep)) < 60, 'last_run' => $sweep,
            'open_attendances' => Attendance::whereNull('check_out_time')->count()];

        $drivers = [];
        foreach (config('plans.verifier.drivers', []) as $d) {
            $last = DB::table('system_settings')->where('key', "payment_verifier.$d")->value('value');
            $drivers[$d] = [
                'configured' => $d === 'verifyet' ? (bool) config('plans.verifier.verifyet.api_key') : true,
                'last'       => $last ? json_decode($last, true) : null,
            ];
        }
        $checks['payment_verification'] = ['ok' => collect($drivers)->contains(fn ($x) => $x['configured']), 'drivers' => $drivers,
            'receiver_check' => (bool) (config('plans.verifier.receiver_account_suffix') || config('plans.verifier.receiver_name'))];

        $checks['storage'] = ['ok' => true, 'stored_files' => DB::table('stored_files')->count(),
            'stored_mb' => round(DB::table('stored_files')->sum('size_bytes') / 1048576, 1)];

        return response()->json([
            'status' => 'success',
            'data'   => [
                'ok'          => collect($checks)->every(fn ($c) => $c['ok']),
                'checks'      => $checks,
                'app'         => ['env' => app()->environment(), 'debug' => (bool) config('app.debug'), 'php' => PHP_VERSION, 'laravel' => app()->version(), 'time' => now()->toIso8601String()],
            ],
        ]);
    }

    // ------------------------------------------------------------------
    // Reports filed by volunteers
    // ------------------------------------------------------------------

    private function presentReport(OrganizationReport $r): array
    {
        return [
            'id'              => $r->id,
            'org_id'          => $r->org_id,
            'organization'    => $r->relationLoaded('organization') ? ['id' => $r->organization?->id, 'name' => $r->organization?->name, 'status' => $r->organization?->status] : null,
            'event'           => $r->event_id ? ['id' => $r->event_id, 'title' => Event::withoutGlobalScopes()->whereKey($r->event_id)->value('title')] : null,
            'reporter'        => $r->relationLoaded('reporter') && $r->reporter ? ['id' => $r->reporter->id, 'name' => $r->reporter->full_name, 'email' => $r->reporter->email] : null,
            'category'        => $r->category,
            'details'         => $r->details,
            'status'          => $r->status,
            'resolution_note' => $r->resolution_note,
            'resolved_at'     => $r->resolved_at?->toIso8601String(),
            'created_at'      => $r->created_at->toIso8601String(),
        ];
    }

    public function listReports(Request $request)
    {
        $q = OrganizationReport::with(['organization', 'reporter'])->latest();
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        $page = $q->paginate(50);

        return response()->json([
            'status'     => 'success',
            'data'       => collect($page->items())->map(fn ($r) => $this->presentReport($r))->values(),
            'pagination' => $this->pagination($page),
        ]);
    }

    public function reviewReport(Request $request, $id)
    {
        $data = $request->validate(['status' => 'required|in:open,reviewing,resolved,dismissed', 'resolution_note' => 'nullable|string|max:2000']);
        $report = OrganizationReport::with(['organization', 'reporter'])->findOrFail($id);
        $report->update($data + (in_array($data['status'], ['resolved', 'dismissed'], true) ? ['resolved_by' => auth()->id(), 'resolved_at' => now()] : []));

        if ($report->reporter && in_array($data['status'], ['resolved', 'dismissed'], true)) {
            $this->notifier->send($report->reporter, new AppNotification('report_closed', 'Your report about ' . $report->organization?->name . ' was reviewed',
                $data['resolution_note'] ?: 'Thank you for helping keep VolunTrack safe.', null));
        }
        $this->audit->log('report.reviewed', $report, [], ['org_name' => $report->organization?->name, 'status' => $data['status']]);

        return response()->json(['status' => 'success', 'data' => $this->presentReport($report->fresh(['organization', 'reporter']))]);
    }
}
