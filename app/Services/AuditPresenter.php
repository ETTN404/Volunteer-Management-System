<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns raw audit_logs rows into something a human can read:
 * actor name + role, organization name, plain-language action, target label and
 * a field-by-field list of changes. Used by both audit pages and the CSV export.
 */
class AuditPresenter
{
    private const ACTIONS = [
        'tenant.status_updated'         => 'Changed organization status / plan',
        'tenant.onboarded'              => 'Onboarded organization',
        'tenant.signed_up'              => 'Organization signed up',
        'tenant.verification_updated'   => 'Reviewed organization verification',
        'user.coordinator_created'      => 'Invited coordinator',
        'user.coordinator_updated'      => 'Edited coordinator',
        'user.activated'                => 'Reactivated account',
        'user.deactivated'              => 'Deactivated account',
        'user.invitation_resent'        => 'Re-sent invitation',
        'volunteer.reactivated'         => 'Reactivated volunteer',
        'volunteer.deactivated'         => 'Paused volunteer',
        'organization.updated'          => 'Updated organization settings',
        'organization.logo_updated'     => 'Changed organization logo',
        'event.created'                 => 'Created event',
        'event.updated'                 => 'Edited event',
        'event.deleted'                 => 'Deleted event',
        'shift.created'                 => 'Created shift',
        'shift.updated'                 => 'Edited shift',
        'shift.deleted'                 => 'Deleted shift',
        'shift.urgent_broadcast'        => 'Sent urgent alert',
        'shift.volunteer_assigned'      => 'Added volunteer to shift',
        'shift.volunteer_removed'       => 'Removed volunteer from shift',
        'application.approved'          => 'Approved application',
        'application.declined'          => 'Declined application',
        'attendance.manual_check_in'    => 'Checked volunteer in manually',
        'attendance.manual_check_out'   => 'Checked volunteer out manually',
        'attendance.hours_verified'     => 'Verified hours',
        'attendance.hours_adjusted'     => 'Adjusted hours',
        'attendance.hours_rejected'     => 'Rejected hours',
        'announcement.created'          => 'Posted announcement',
        'announcement.deleted'          => 'Removed announcement',
        'document.verified'             => 'Verified document',
        'document.rejected'             => 'Rejected document',
        'payment.submitted'             => 'Submitted payment',
        'payment.verified'              => 'Confirmed payment',
        'payment.rejected'              => 'Rejected payment',
        'report.reviewed'               => 'Reviewed report on organization',
    ];

    private const MODELS = [
        'App\\Models\\Organization'    => 'Organization',
        'App\\Models\\User'            => 'User',
        'App\\Models\\Event'           => 'Event',
        'App\\Models\\Shift'           => 'Shift',
        'App\\Models\\ShiftAssignment' => 'Application',
        'App\\Models\\Attendance'      => 'Attendance',
        'App\\Models\\Announcement'    => 'Announcement',
        'App\\Models\\VolunteerDocument' => 'Document',
        'App\\Models\\Volunteer'       => 'Volunteer',
        'App\\Models\\Payment'         => 'Payment',
        'App\\Models\\OrganizationReport' => 'Report',
    ];

    public function query(Request $request, ?int $orgId = null)
    {
        $q = DB::table('audit_logs')->orderByDesc('id');
        if ($orgId !== null) {
            $q->where('org_id', $orgId);
        } elseif ($request->filled('org_id')) {
            $q->where('org_id', (int) $request->org_id);
        }
        if ($request->filled('action')) {
            $q->where('action', 'like', $request->action . '%');
        }
        if ($request->filled('user_id')) {
            $q->where('user_id', (int) $request->user_id);
        }
        if ($request->filled('from')) {
            $q->where('created_at', '>=', $request->from . ' 00:00:00');
        }
        if ($request->filled('to')) {
            $q->where('created_at', '<=', $request->to . ' 23:59:59');
        }
        return $q;
    }

    public function present(Collection $rows): Collection
    {
        $users = User::withoutGlobalScopes()->whereIn('id', $rows->pluck('user_id')->filter()->unique())->get()->keyBy('id');
        $orgIds = $rows->pluck('org_id')->merge(
            $rows->where('model_type', 'App\\Models\\Organization')->pluck('model_id')
        )->filter()->unique();
        $orgs = Organization::withTrashed()->whereIn('id', $orgIds)->pluck('name', 'id');

        return $rows->map(function ($log) use ($users, $orgs) {
            $old = is_string($log->old_values) ? json_decode($log->old_values, true) : (array) ($log->old_values ?? []);
            $new = is_string($log->new_values) ? json_decode($log->new_values, true) : (array) ($log->new_values ?? []);
            $old = $old ?: [];
            $new = $new ?: [];
            $actor = $users[$log->user_id] ?? null;
            $orgName = $log->org_id ? ($orgs[$log->org_id] ?? "Organization #{$log->org_id}") : null;
            if (!$orgName && $log->model_type === 'App\\Models\\Organization') {
                $orgName = $orgs[$log->model_id] ?? null;
            }

            return [
                'id'           => $log->id,
                'created_at'   => $log->created_at,
                'action'       => $log->action,
                'action_label' => self::ACTIONS[$log->action] ?? ucfirst(str_replace(['.', '_'], ' ', $log->action)),
                'user_id'      => $log->user_id,
                'actor'        => $actor ? ['id' => $actor->id, 'name' => $actor->full_name, 'email' => $actor->email, 'role' => $actor->role] : null,
                'org_id'       => $log->org_id,
                'organization' => $orgName,
                'model_type'   => $log->model_type,
                'target_type'  => self::MODELS[$log->model_type] ?? ($log->model_type ? class_basename($log->model_type) : null),
                'model_id'     => $log->model_id,
                'target_label' => $this->targetLabel($log, $old, $new, $orgs),
                'changes'      => $this->changes($old, $new),
                'old_values'   => $old,
                'new_values'   => $new,
                'ip_address'   => $this->ip($log->ip_address),
                'user_agent'   => $log->user_agent ?? null,
            ];
        });
    }

    public function csv(Collection $presented): string
    {
        $out = fopen('php://temp', 'r+');
        fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows Amharic names correctly
        fputcsv($out, ['Date (UTC)', 'Action', 'Done by', 'Role', 'Email', 'Organization', 'Target', 'Changes', 'IP address', 'Log ID']);
        foreach ($presented as $r) {
            fputcsv($out, [
                $r['created_at'],
                $r['action_label'],
                $r['actor']['name'] ?? 'System',
                $r['actor']['role'] ?? '',
                $r['actor']['email'] ?? '',
                $r['organization'] ?? 'Platform',
                trim(($r['target_type'] ?? '') . ' ' . ($r['target_label'] ?? '')),
                collect($r['changes'])->map(fn ($c) => "{$c['field']}: {$c['from']} → {$c['to']}")->implode('; '),
                $r['ip_address'],
                $r['id'],
            ]);
        }
        rewind($out);
        return stream_get_contents($out);
    }

    private function changes(array $old, array $new): array
    {
        $fmt = function ($v) {
            if ($v === null || $v === '') return '—';
            if (is_bool($v)) return $v ? 'yes' : 'no';
            if (is_array($v)) return implode(', ', array_map(fn ($x) => is_scalar($x) ? (string) $x : json_encode($x), $v));
            return (string) $v;
        };
        $label = fn ($k) => ucfirst(str_replace('_', ' ', $k));

        $out = [];
        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $key) {
            if (in_array($key, ['org_name'], true)) {
                continue;
            }
            $from = $old[$key] ?? null;
            $to   = $new[$key] ?? null;
            if ($from == $to && array_key_exists($key, $old) && array_key_exists($key, $new)) {
                continue;
            }
            $out[] = ['field' => $label($key), 'from' => array_key_exists($key, $old) ? $fmt($from) : '—', 'to' => array_key_exists($key, $new) ? $fmt($to) : '—'];
        }
        return $out;
    }

    private function targetLabel($log, array $old, array $new, $orgs): ?string
    {
        foreach (['org_name', 'title', 'full_name', 'volunteer', 'name', 'event'] as $k) {
            if (!empty($new[$k]) && is_string($new[$k])) return $new[$k];
            if (!empty($old[$k]) && is_string($old[$k])) return $old[$k];
        }
        if ($log->model_type === 'App\\Models\\Organization' && isset($orgs[$log->model_id])) {
            return $orgs[$log->model_id];
        }
        if ($log->model_type === 'App\\Models\\User' && $log->model_id) {
            return User::withoutGlobalScopes()->whereKey($log->model_id)->value('full_name') ?? "#{$log->model_id}";
        }
        return $log->model_id ? "#{$log->model_id}" : null;
    }

    private function ip(?string $ip): string
    {
        return match ($ip) {
            null, '' => '—',
            '::1', '127.0.0.1' => 'localhost',
            default => $ip,
        };
    }
}
