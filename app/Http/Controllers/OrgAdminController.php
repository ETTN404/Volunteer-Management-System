<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateCoordinatorRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\VolunteerResource;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\User;
use App\Models\Volunteer;
use App\Notifications\AppNotification;
use App\Services\AuditLogService;
use App\Services\AuditPresenter;
use App\Services\FileStore;
use App\Services\InvitationService;
use App\Services\Notifier;
use App\Services\PaymentVerifier;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrgAdminController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private PlanService $plans,
        private InvitationService $invitations,
        private FileStore $files,
        private Notifier $notifier,
    ) {}

    private function org(): Organization
    {
        return Organization::findOrFail(auth()->user()->org_id);
    }

    public function getOrganization()
    {
        $org = $this->org();
        return response()->json([
            'status' => 'success',
            'data'   => (new OrganizationResource($org))->resolve() + ['billing' => $this->plans->snapshot($org)],
        ]);
    }

    /** Settings & brand: profile, contact, location, color, subdomain and attendance policy. */
    public function updateOrganization(UpdateOrganizationRequest $request)
    {
        $org    = $this->org();
        $fields = ['name', 'address', 'country', 'city', 'phone', 'website', 'primary_color', 'subdomain'];
        $data   = $request->only($fields);

        if (array_key_exists('primary_color', $data) && $data['primary_color'] !== $org->primary_color && $data['primary_color'] !== null) {
            $this->plans->ensureFeature($org, 'branding');
        }
        if (array_key_exists('subdomain', $data) && $data['subdomain'] !== $org->subdomain && $data['subdomain'] !== null) {
            $this->plans->ensureFeature($org, 'subdomain');
            $data['subdomain'] = Str::lower($data['subdomain']);
        }

        if ($request->has('attendance')) {
            $settings = $org->settings ?? [];
            $settings['attendance'] = array_merge($settings['attendance'] ?? [], $request->input('attendance'));
            $data['settings'] = $settings;
        }

        $oldData = $org->only($fields) + ['attendance' => $org->attendancePolicy()];
        $org->update($data);
        $org->refresh();
        $this->audit->log('organization.updated', $org, $oldData, $org->only($fields) + ['attendance' => $org->attendancePolicy()]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Organization settings updated successfully.',
            'data'    => (new OrganizationResource($org))->resolve() + ['billing' => $this->plans->snapshot($org)],
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate(['logo' => 'required|image|mimes:png,jpg,jpeg,webp,svg|max:1024']);
        $org  = $this->org();
        $path = $this->files->put($request->file('logo'), 'public');
        $this->files->delete($org->logo_path);
        $org->update(['logo_path' => $path]);
        $this->audit->log('organization.logo_updated', $org);

        return response()->json(['status' => 'success', 'data' => new OrganizationResource($org->fresh())]);
    }

    public function removeLogo()
    {
        $org = $this->org();
        $this->files->delete($org->logo_path);
        $org->update(['logo_path' => null]);
        return response()->json(['status' => 'success', 'data' => new OrganizationResource($org->fresh())]);
    }

    // ------------------------------------------------------------------
    // Coordinators (G19) — invitation based, no typed passwords
    // ------------------------------------------------------------------

    public function createCoordinator(CreateCoordinatorRequest $request)
    {
        $org = $this->org();
        $this->plans->ensureWithinLimit($org, 'coordinators');

        $coordinator = User::create([
            'org_id'     => $org->id,
            'first_name' => trim($request->first_name),
            'last_name'  => trim($request->last_name),
            'email'      => strtolower(trim($request->email)),
            'phone'      => $request->phone,
            'password'   => Str::random(40), // replaced by the invitation
            'role'       => 'Coordinator',
        ]);
        $invite = $this->invitations->issue($coordinator, auth()->user());

        $this->audit->log('user.coordinator_created', $coordinator, [], [
            'full_name' => $coordinator->full_name, 'email' => $coordinator->email, 'phone' => $coordinator->phone, 'invitation_emailed' => $invite['email_sent'],
        ]);

        return response()->json([
            'status'     => 'success',
            'message'    => $invite['email_sent']
                ? "Invitation sent to {$coordinator->email}."
                : 'Coordinator created, but the email could not be sent. Share the invitation link yourself.',
            'data'       => new UserResource($coordinator),
            'invitation' => $invite,
        ], 201);
    }

    public function updateCoordinator(Request $request, $id)
    {
        $user = User::where('org_id', auth()->user()->org_id)->where('role', 'Coordinator')->findOrFail($id);
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:60',
            'last_name'  => 'sometimes|string|max:60',
            'email'      => 'sometimes|email|max:100|unique:users,email,' . $user->id,
            'phone'      => ['sometimes', 'nullable', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
        ]);
        $old = $user->only(array_keys($data));
        $user->update($data);
        $this->audit->log('user.coordinator_updated', $user, $old, $user->only(array_keys($data)) + ['full_name' => $user->full_name]);

        return response()->json(['status' => 'success', 'data' => new UserResource($user)]);
    }

    public function toggleCoordinatorStatus($id)
    {
        $user = User::where('org_id', auth()->user()->org_id)->where('role', 'Coordinator')->findOrFail($id);
        $active = !($user->is_active ?? true);
        $user->update(['is_active' => $active]);
        if (!$active) {
            $user->tokens()->delete();
        }
        $this->audit->log($active ? 'user.activated' : 'user.deactivated', $user, [], ['full_name' => $user->full_name]);

        return response()->json([
            'status'    => 'success',
            'message'   => $active ? 'Coordinator reactivated.' : 'Coordinator deactivated and signed out.',
            'is_active' => $active,
        ]);
    }

    public function resendCoordinatorInvite($id)
    {
        $user = User::where('org_id', auth()->user()->org_id)->where('role', 'Coordinator')->findOrFail($id);
        if (!$user->must_change_password) {
            return response()->json(['status' => 'error', 'message' => 'This coordinator already set a password.'], 422);
        }
        $invite = $this->invitations->issue($user, auth()->user());
        $this->audit->log('user.invitation_resent', $user, [], ['full_name' => $user->full_name]);

        return response()->json(['status' => 'success', 'message' => 'A new invitation was sent.', 'invitation' => $invite]);
    }

    // ------------------------------------------------------------------
    // Members
    // ------------------------------------------------------------------

    public function listMembers(Request $request)
    {
        $orgId = auth()->user()->org_id;
        $query = User::withoutGlobalScopes()->where(function ($q) use ($orgId) {
            $q->where(fn ($m) => $m->where('org_id', $orgId)->where('role', '!=', 'OrgAdmin'))
              ->orWhereIn('id', Volunteer::query()->engagedWith($orgId)->select('volunteers.user_id'));
        });

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }
        if ($q = trim((string) $request->query('q'))) {
            $query->where(fn ($w) => $w->where('full_name', 'like', "%$q%")->orWhere('email', 'like', "%$q%"));
        }
        $members = $query->with('volunteer')->latest()->paginate(min(100, (int) $request->query('per_page', 25)));

        return response()->json([
            'status'     => 'success',
            'data'       => collect($members->items())->map(fn ($u) => (new UserResource($u))->resolve() + [
                'relationship' => $u->org_id === $orgId ? 'member' : 'applicant',
                'invitation_pending' => (bool) $u->must_change_password && $u->role !== 'Volunteer',
            ])->values(),
            'pagination' => [
                'current_page' => $members->currentPage(),
                'last_page'    => $members->lastPage(),
                'per_page'     => $members->perPage(),
                'total'        => $members->total(),
            ],
        ]);
    }

    public function toggleVolunteerStatus($userId)
    {
        $user = User::where('org_id', auth()->user()->org_id)->where('id', $userId)->where('role', 'Volunteer')->firstOrFail();
        $newStatus = !($user->is_active ?? true);
        $user->update(['is_active' => $newStatus]);
        if (!$newStatus) {
            $user->tokens()->delete();
        }
        $this->audit->log($newStatus ? 'volunteer.reactivated' : 'volunteer.deactivated', $user, [], ['full_name' => $user->full_name]);

        return response()->json([
            'status'    => 'success',
            'message'   => $newStatus ? 'Volunteer account reactivated.' : 'Volunteer account deactivated.',
            'is_active' => $newStatus,
        ]);
    }

    public function viewVolunteer($volunteerId)
    {
        return app(CoordinatorController::class)->showVolunteer($volunteerId);
    }

    // ------------------------------------------------------------------
    // Analytics (G18) & audit (G21)
    // ------------------------------------------------------------------

    public function analytics()
    {
        $org      = $this->org();
        $orgId    = $org->id;
        $shiftIds = Shift::query()->forOrg($orgId)->select('shifts.id');
        $volunteers = Volunteer::query()->engagedWith($orgId)->get();

        $attendance = Attendance::whereIn('shift_id', $shiftIds)->where('check_in_time', '>=', now()->subMonths(11)->startOfMonth())->get();
        $byMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i)->format('Y-m');
            $rows = $attendance->filter(fn ($a) => $a->check_in_time?->format('Y-m') === $m);
            $byMonth[] = [
                'month'      => $m,
                'hours'      => round($rows->sum(fn ($a) => in_array($a->hours_status, ['verified', 'adjusted'], true) ? (float) $a->verified_hours : 0), 2),
                'volunteers' => $rows->pluck('volunteer_id')->unique()->count(),
                'shifts'     => $rows->pluck('shift_id')->unique()->count(),
            ];
        }

        $skills = $volunteers->flatMap(fn ($v) => $v->skills ?? [])->countBy()->sortDesc()->take(8)
            ->map(fn ($count, $skill) => ['skill' => $skill, 'count' => $count])->values();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'volunteers'        => $volunteers->count(),
                'active_volunteers' => Attendance::whereIn('shift_id', $shiftIds)->where('check_in_time', '>=', now()->subDays(90))->distinct('volunteer_id')->count('volunteer_id'),
                'coordinators'      => User::where('org_id', $orgId)->where('role', 'Coordinator')->count(),
                'events'            => Event::where('org_id', $orgId)->count(),
                'upcoming_events'   => Event::where('org_id', $orgId)->whereIn('status', ['upcoming', 'ongoing'])->count(),
                'total_hours'       => round((float) Attendance::whereIn('shift_id', $shiftIds)->whereIn('hours_status', ['verified', 'adjusted'])->sum('verified_hours'), 2),
                'pending_hours'     => Attendance::whereIn('shift_id', $shiftIds)->whereNotNull('check_out_time')->where('hours_status', 'pending')->count(),
                'fill_rate'         => $this->fillRate($orgId),
                'no_show_rate'      => $this->noShowRate($orgId),
                'hours_by_month'    => $byMonth,
                'top_skills'        => $skills,
                'advanced'          => $this->plans->has($org, 'analytics'),
            ],
        ]);
    }

    private function fillRate(int $orgId): ?float
    {
        $shifts = Shift::query()->forOrg($orgId)->where('start_time', '<', now())->where('start_time', '>', now()->subDays(90))
            ->withCount(['shiftAssignments as confirmed_count' => fn ($q) => $q->where('status', 'confirmed')])->get();
        $cap = $shifts->sum('capacity');
        return $cap > 0 ? round(min(1, $shifts->sum(fn ($s) => min($s->capacity, $s->confirmed_count)) / $cap) * 100, 1) : null;
    }

    private function noShowRate(int $orgId): ?float
    {
        $past = Shift::query()->forOrg($orgId)->where('end_time', '<', now())->where('end_time', '>', now()->subDays(90))->pluck('id');
        $confirmed = \App\Models\ShiftAssignment::whereIn('shift_id', $past)->where('status', 'confirmed')->count();
        if ($confirmed === 0) {
            return null;
        }
        $attended = Attendance::whereIn('shift_id', $past)->get(['shift_id', 'volunteer_id'])
            ->unique(fn ($a) => $a->shift_id . '-' . $a->volunteer_id)->count();
        return round(max(0, 1 - $attended / $confirmed) * 100, 1);
    }

    public function auditLogs(Request $request, AuditPresenter $presenter)
    {
        $this->plans->ensureFeature($this->org(), 'audit_log');
        $page = $presenter->query($request, auth()->user()->org_id)->paginate(min(200, (int) $request->query('per_page', 50)));

        if ($request->query('format') === 'csv') {
            $all = $presenter->present($presenter->query($request, auth()->user()->org_id)->limit(5000)->get());
            return response($presenter->csv($all), 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="audit-trail-' . now()->toDateString() . '.csv"',
            ]);
        }

        return response()->json([
            'status'     => 'success',
            'data'       => $presenter->present(collect($page->items())),
            'pagination' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }

    // ------------------------------------------------------------------
    // Billing
    // ------------------------------------------------------------------

    public function billing()
    {
        $org = $this->org();
        return response()->json([
            'status' => 'success',
            'data'   => $this->plans->snapshot($org) + [
                'catalog'         => collect(config('plans.plans'))->map(fn ($p, $k) => ['key' => $k] + $p)->values(),
                'payment_methods' => config('plans.payment_methods'),
                'account_name'    => config('plans.account_name'),
                'currency'        => config('plans.currency'),
                'auto_verification' => !empty(config('plans.verifier.drivers')),
                'payments'        => Payment::where('org_id', $org->id)->latest()->limit(50)->get()->map(fn ($p) => self::presentPayment($p))->values(),
            ],
        ]);
    }

    public function submitPayment(Request $request, PaymentVerifier $verifier)
    {
        $methods = collect(config('plans.payment_methods'))->pluck('key')->all();
        $data = $request->validate([
            'plan'                 => 'required|in:pro,enterprise',
            'months'               => 'required|integer|in:1,3,6,12',
            'method'               => 'required|in:' . implode(',', $methods),
            'transaction_ref'      => 'required|string|min:6|max:100',
            'payer_name'           => 'nullable|string|max:120',
            'payer_account_suffix' => 'nullable|string|max:12',
        ]);
        $org = $this->org();
        $ref = strtoupper(trim(preg_replace('/\s+/', '', $data['transaction_ref'])));

        if (Payment::where('method', $data['method'])->where('transaction_ref', $ref)->exists()) {
            return response()->json(['message' => 'This transaction reference was already submitted.', 'errors' => ['transaction_ref' => ['Already used.']]], 422);
        }

        $price    = (float) config("plans.plans.{$data['plan']}.price_monthly");
        $discount = ['1' => 0, '3' => 0, '6' => 0.10, '12' => 0.20][(string) $data['months']];
        $amount   = round($price * $data['months'] * (1 - $discount), 2);

        $payment = Payment::create([
            'org_id'               => $org->id,
            'plan'                 => $data['plan'],
            'months'               => $data['months'],
            'amount'               => $amount,
            'currency'             => config('plans.currency', 'ETB'),
            'method'               => $data['method'],
            'transaction_ref'      => $ref,
            'payer_name'           => $data['payer_name'] ?? null,
            'payer_account_suffix' => $data['payer_account_suffix'] ?? null,
            'status'               => 'pending',
            'submitted_by'         => auth()->id(),
        ]);

        $result = $verifier->verify($payment);
        $payment->update([
            'verification_source'   => $result['source'],
            'verification_response' => ['reason' => $result['reason'], 'attempts' => $result['attempts'], 'receipt' => $result['receipt'] ? array_diff_key($result['receipt'], ['raw' => 1]) : null],
        ]);

        if ($result['outcome'] === PaymentVerifier::OUTCOME_VERIFIED) {
            self::activate($payment, null);
        } elseif ($result['outcome'] === PaymentVerifier::OUTCOME_REJECTED) {
            $payment->update(['status' => 'rejected', 'notes' => $result['reason']]);
        } else {
            $this->notifier->send($this->notifier->superAdmins(), new AppNotification(
                'payment_pending',
                $org->name . ' submitted a payment',
                number_format($amount, 2) . ' ETB via ' . $data['method'] . ' (ref ' . $ref . ') needs confirmation.',
                '/p/payments',
            ));
        }
        $this->audit->log('payment.submitted', $payment, [], ['plan' => $payment->plan, 'amount' => (float) $amount, 'method' => $payment->method, 'outcome' => $result['outcome']]);

        return response()->json([
            'status'  => 'success',
            'message' => match ($result['outcome']) {
                PaymentVerifier::OUTCOME_VERIFIED => 'Payment confirmed with the bank — your plan is active.',
                PaymentVerifier::OUTCOME_REJECTED => 'We could not accept this payment: ' . $result['reason'],
                default                           => 'Payment received. We will confirm it shortly — usually within one business day.',
            },
            'data'    => self::presentPayment($payment->fresh()),
        ], 201);
    }

    /** Turn a verified payment into plan time (extends an active plan of the same tier). */
    public static function activate(Payment $payment, ?User $by): void
    {
        DB::transaction(function () use ($payment, $by) {
            $org   = Organization::lockForUpdate()->find($payment->org_id);
            $start = ($org->subscription_plan === $payment->plan && $org->plan_expires_at && $org->plan_expires_at->isFuture())
                ? $org->plan_expires_at->copy() : now();

            $org->update(['subscription_plan' => $payment->plan, 'plan_expires_at' => $start->addMonths($payment->months)]);
            $payment->update(['status' => 'verified', 'reviewed_by' => $by?->id, 'reviewed_at' => now()]);

            $n = app(Notifier::class);
            $n->send($n->orgAdmins($org->id), new AppNotification(
                'payment_verified',
                'Your ' . config("plans.plans.{$payment->plan}.name") . ' plan is active',
                'Paid until ' . $org->plan_expires_at->toFormattedDateString() . '. Thank you!',
                '/o/billing',
            ));
        });
    }

    public static function presentPayment(Payment $p): array
    {
        return [
            'id'                   => $p->id,
            'org_id'               => $p->org_id,
            'organization'         => $p->relationLoaded('organization') ? ['id' => $p->organization?->id, 'name' => $p->organization?->name] : null,
            'plan'                 => $p->plan,
            'months'               => $p->months,
            'amount'               => (float) $p->amount,
            'currency'             => $p->currency,
            'method'               => $p->method,
            'transaction_ref'      => $p->transaction_ref,
            'payer_name'           => $p->payer_name,
            'payer_account_suffix' => $p->payer_account_suffix,
            'status'               => $p->status,
            'verification_source'  => $p->verification_source ?? 'manual',
            'verification_note'    => $p->verification_response['reason'] ?? null,
            'receipt'              => $p->verification_response['receipt'] ?? null,
            'notes'                => $p->notes,
            'submitted_by'         => $p->relationLoaded('submitter') ? $p->submitter?->full_name : null,
            'reviewed_at'          => $p->reviewed_at?->toIso8601String(),
            'created_at'           => $p->created_at->toIso8601String(),
        ];
    }
}
