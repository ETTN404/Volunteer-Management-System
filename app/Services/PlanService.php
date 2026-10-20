<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Shift;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Plan entitlements. Every limit and feature check for an organization goes
 * through here so access is decided on the server, never only in the UI.
 */
class PlanService
{
    public function plan(Organization $org): array
    {
        $key = $org->effectivePlan();
        return ['key' => $key] + config("plans.plans.$key");
    }

    public function has(Organization $org, string $feature): bool
    {
        return in_array($feature, $this->plan($org)['features'] ?? [], true);
    }

    public function limit(Organization $org, string $key): ?int
    {
        return $this->plan($org)['limits'][$key] ?? null;
    }

    /** Cheapest plan that includes a feature (for "upgrade to …" messages). */
    public function requiredPlanFor(string $feature): string
    {
        foreach (config('plans.order') as $key) {
            if (in_array($feature, config("plans.plans.$key.features", []), true)) {
                return $key;
            }
        }
        return 'enterprise';
    }

    public function usage(Organization $org): array
    {
        $eventIds = Event::withoutGlobalScopes()->where('org_id', $org->id);

        return [
            'coordinators'         => User::withoutGlobalScopes()->where('org_id', $org->id)->where('role', 'Coordinator')->count(),
            'active_events'        => (clone $eventIds)->whereIn('status', ['upcoming', 'ongoing'])->count(),
            'volunteers'           => Volunteer::query()->engagedWith($org->id)->count(),
            'broadcasts_per_month' => Announcement::withoutGlobalScopes()->where('org_id', $org->id)
                ->where('kind', 'urgent')->where('created_at', '>=', now()->startOfMonth())->count(),
            'storage_mb'           => round(
                (\App\Models\OrganizationDocument::where('org_id', $org->id)->sum('file_size_bytes')
                + \App\Models\VolunteerDocument::where('org_id', $org->id)->sum('file_size_bytes')) / 1048576, 1),
        ];
    }

    /** Full billing snapshot for the org admin and the platform console. */
    public function snapshot(Organization $org): array
    {
        $plan  = $this->plan($org);
        $usage = $this->usage($org);
        $limits = [];
        foreach ($plan['limits'] as $key => $max) {
            $limits[$key] = ['used' => $usage[$key] ?? 0, 'limit' => $max];
        }

        return [
            'plan'            => $plan['key'],
            'plan_name'       => $plan['name'],
            'subscribed_plan' => $org->subscription_plan ?: 'free',
            'plan_expires_at' => $org->plan_expires_at?->toIso8601String(),
            'features'        => $plan['features'],
            'limits'          => $limits,
        ];
    }

    public function ensureFeature(Organization $org, string $feature): void
    {
        if (!$this->has($org, $feature)) {
            $required = $this->requiredPlanFor($feature);
            $this->deny(
                'This feature needs the ' . config("plans.plans.$required.name") . ' plan.',
                ['code' => 'plan_required', 'feature' => $feature, 'required_plan' => $required]
            );
        }
    }

    /** Refuse an action that would push usage over the plan limit. */
    public function ensureWithinLimit(Organization $org, string $key, int $adding = 1, ?int $current = null): void
    {
        $max = $this->limit($org, $key);
        if ($max === null) {
            return;
        }
        $used = $current ?? ($this->usage($org)[$key] ?? 0);
        if ($used + $adding > $max) {
            $labels = [
                'coordinators'         => 'coordinators',
                'active_events'        => 'active events',
                'shifts_per_event'     => 'shifts per event',
                'volunteers'           => 'volunteers',
                'broadcasts_per_month' => 'urgent alerts this month',
                'storage_mb'           => 'MB of document storage',
            ];
            $this->deny(
                "Your {$this->plan($org)['name']} plan allows {$max} {$labels[$key]}. Upgrade to add more.",
                ['code' => 'plan_limit', 'limit_key' => $key, 'limit' => $max, 'used' => $used]
            );
        }
    }

    public function ensureShiftCapacity(Organization $org, Event $event): void
    {
        $this->ensureWithinLimit($org, 'shifts_per_event', 1, Shift::where('event_id', $event->id)->count());
    }

    private function deny(string $message, array $extra): never
    {
        throw new HttpResponseException(response()->json(['status' => 'error', 'message' => $message] + $extra, 402));
    }
}
