<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Write a structured audit log entry to the audit_logs table.
     *
     * Captures who did what, to which model, from which IP address, along with
     * before/after values for mutation tracing.
     *
     * This method is intentionally silent — it catches and swallows any exception
     * so that a logging failure never breaks the user-facing request flow.
     *
     * @param string     $action     Namespaced action label (e.g. 'application.approved')
     * @param Model|null $model      The Eloquent model instance being acted upon, if any
     * @param array      $oldValues  Snapshot of fields BEFORE the change
     * @param array      $newValues  Snapshot of fields AFTER the change
     * @return void
     */
    public function log(
        string $action,
        ?Model $model = null,
        array $oldValues = [],
        array $newValues = []
    ): void {
        try {
            $user = Auth::user();

            DB::table('audit_logs')->insert([
                'user_id'    => $user?->id,
                'org_id'     => $user?->org_id,
                'action'     => $action,
                'model_type' => $model ? get_class($model) : null,
                'model_id'   => $model?->getKey(),
                'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
                'new_values' => !empty($newValues) ? json_encode($newValues) : null,
                'ip_address' => Request::ip(),
                'user_agent' => substr(Request::userAgent() ?? '', 0, 255),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Silently fail — audit log writes must never interrupt the main flow
            // Log to the Laravel error channel for infrastructure monitoring
            logger()->error('AuditLogService write failed: ' . $e->getMessage(), [
                'action' => $action,
            ]);
        }
    }
}
