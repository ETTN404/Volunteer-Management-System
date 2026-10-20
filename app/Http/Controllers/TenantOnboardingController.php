<?php

namespace App\Http\Controllers;

use App\Http\Requests\OnboardTenantRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\AppNotification;
use App\Services\AuditLogService;
use App\Services\InvitationService;
use App\Services\Notifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantOnboardingController extends Controller
{
    public function __construct(
        private InvitationService $invitations,
        private AuditLogService $audit,
        private Notifier $notifier,
    ) {}

    /** SuperAdmin onboarding: verified immediately, plan chosen by the admin (Free by default). */
    public function onboard(OnboardTenantRequest $request)
    {
        [$org, $admin, $invite] = $this->create($request, verified: true, plan: $request->plan ?? 'free');
        $this->audit->log('tenant.onboarded', $org, [], ['org_name' => $org->name, 'plan' => $org->subscription_plan, 'admin' => $admin->email]);

        return response()->json([
            'status'  => 'success',
            'message' => $invite['email_sent']
                ? "Organization onboarded. An invitation was emailed to {$admin->email}."
                : 'Organization onboarded, but the invitation email could not be sent. Copy the invitation link below.',
            'data'    => [
                'organization' => new OrganizationResource($org),
                'admin'        => new UserResource($admin),
                'invitation'   => $invite,
            ],
        ], 201);
    }

    /**
     * Public self sign-up. The organization starts on Free, can set up its team
     * and events right away, but stays hidden from volunteers until the platform
     * team verifies the documents.
     */
    public function signup(OnboardTenantRequest $request)
    {
        [$org, $admin, $invite] = $this->create($request, verified: false, plan: 'free');
        $this->audit->log('tenant.signed_up', $org, [], ['org_name' => $org->name, 'admin' => $admin->email]);

        $this->notifier->send($this->notifier->superAdmins(), new AppNotification(
            'organization_signup',
            $org->name . ' signed up',
            'Review their documents to verify the organization (' . ($org->city ? $org->city . ', ' : '') . $org->country . ').',
            '/p/organizations/' . $org->id,
        ));

        return response()->json([
            'status'  => 'success',
            'message' => "Thanks! Check {$admin->email} for your invitation. Volunteers will see your events once our team verifies your documents (usually within 2 business days).",
            'data'    => [
                'organization' => ['id' => $org->id, 'name' => $org->name, 'verification_status' => $org->verification_status],
                'email_sent'   => $invite['email_sent'],
            ],
        ], 201);
    }

    /** @return array{0: Organization, 1: User, 2: array} */
    private function create(OnboardTenantRequest $request, bool $verified, string $plan): array
    {
        $result = DB::transaction(function () use ($request, $verified, $plan) {
            $org = Organization::create([
                'name'                => trim($request->org_name),
                'email'               => strtolower(trim($request->org_email)),
                'country'             => strtoupper($request->org_country),
                'city'                => trim($request->org_city),
                'address'             => $request->org_address ?: trim($request->org_city) . ', ' . strtoupper($request->org_country),
                'phone'               => $request->org_phone,
                'website'             => $request->org_website,
                'status'              => 'active',
                'subscription_plan'   => $plan,
                'verification_status' => $verified ? 'verified' : 'pending',
                'verified_at'         => $verified ? now() : null,
            ]);

            $admin = User::create([
                'org_id'     => $org->id,
                'first_name' => trim($request->admin_first_name),
                'last_name'  => trim($request->admin_last_name),
                'email'      => strtolower(trim($request->admin_email)),
                'phone'      => $request->admin_phone,
                'password'   => Str::random(40),
                'role'       => 'OrgAdmin',
            ]);

            foreach ((array) $request->file('documents', []) as $i => $doc) {
                $file = $doc['file'] ?? null;
                if ($file) {
                    DocumentController::storeOrgDocument(
                        $org,
                        $file,
                        $request->input("documents.$i.type", 'registration_certificate'),
                        $request->input("documents.$i.title") ?: ucfirst(str_replace('_', ' ', $request->input("documents.$i.type", 'document'))),
                    );
                }
            }

            return [$org, $admin];
        });

        [$org, $admin] = $result;
        $invite = $this->invitations->issue($admin, $request->user());

        return [$org->fresh(), $admin->fresh(), $invite];
    }
}
