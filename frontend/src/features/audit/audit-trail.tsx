import { ArrowRight, Download, ScrollText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuditLog } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Select, Sheet, SheetContent, Skeleton } from '@/shared/ui';

const ACTION_META: Record<string, { label: string; tone: 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' }> = {
  'tenant.onboarded': { label: 'Organization onboarded', tone: 'success' },
  'tenant.status_updated': { label: 'Organization status changed', tone: 'warning' },
  'organization.updated': { label: 'Organization settings updated', tone: 'info' },
  'user.coordinator_created': { label: 'Coordinator added', tone: 'success' },
  'user.coordinator_updated': { label: 'Coordinator edited', tone: 'info' },
  'user.coordinator_deactivated': { label: 'Coordinator deactivated', tone: 'danger' },
  'user.coordinator_reactivated': { label: 'Coordinator reactivated', tone: 'success' },
  'user.admin_deactivated': { label: 'Org admin deactivated', tone: 'danger' },
  'user.admin_reactivated': { label: 'Org admin reactivated', tone: 'success' },
  'volunteer.deactivated': { label: 'Volunteer deactivated', tone: 'danger' },
  'volunteer.reactivated': { label: 'Volunteer reactivated', tone: 'success' },
  'event.updated': { label: 'Event updated', tone: 'info' },
  'event.deleted': { label: 'Event deleted', tone: 'danger' },
  'shift.updated': { label: 'Shift updated', tone: 'info' },
  'shift.deleted': { label: 'Shift deleted', tone: 'danger' },
  'shift.urgent_broadcast': { label: 'Urgent alert sent', tone: 'accent' },
  'announcement.created': { label: 'Announcement posted', tone: 'info' },
  'attendance.force_checkin': { label: 'Manual check-in', tone: 'warning' },
  'report.generated': { label: 'Report generated', tone: 'info' },
};

export const actionLabel = (a: string) => ACTION_META[a]?.label ?? a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const actionTone = (a: string) => ACTION_META[a]?.tone ?? (a.includes('verified') ? 'success' : a.includes('rejected') ? 'danger' : 'neutral');

function fmtValue(v: unknown) {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Diff({ log }: { log: AuditLog }) {
  const keys = [...new Set([...Object.keys(log.old_values ?? {}), ...Object.keys(log.new_values ?? {})])];
  if (keys.length === 0) return <p className="text-sm text-muted">No field changes were recorded for this action.</p>;
  return (
    <dl className="space-y-2">
      {keys.map((k) => {
        const before = log.old_values?.[k];
        const after = log.new_values?.[k];
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        return (
          <div key={k} className="rounded-lg bg-surface-2 p-3">
            <dt className="type-eyebrow-sm mb-1.5">{k.replace(/_/g, ' ')}</dt>
            <dd className="type-data flex flex-wrap items-center gap-2 text-[12.5px]">
              {log.old_values && <span className={cn(changed ? 'text-danger-text line-through decoration-danger/40' : 'text-muted')}>{fmtValue(before)}</span>}
              {log.old_values && log.new_values && changed && <ArrowRight className="size-3.5 text-faint" />}
              {log.new_values && changed && <span className="text-success-text">{fmtValue(after)}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function toCsv(logs: AuditLog[]) {
  const head = ['id', 'created_at', 'action', 'user_id', 'org_id', 'model_type', 'model_id', 'ip_address', 'old_values', 'new_values'];
  const esc = (v: unknown) => `"${fmtValue(v).replace(/"/g, '""')}"`;
  return [head.join(','), ...logs.map((l) => head.map((h) => esc((l as unknown as Record<string, unknown>)[h])).join(','))].join('\n');
}

export function AuditTrail({ logs, isLoading, error, onRetry, orgName }: { logs?: AuditLog[]; isLoading: boolean; error: unknown; onRetry: () => void; orgName?: (id: number | null) => string | undefined }) {
  const [q, setQ] = useState('');
  const [action, setAction] = useState('all');
  const [open, setOpen] = useState<AuditLog | null>(null);

  const actions = useMemo(() => [...new Set((logs ?? []).map((l) => l.action))].sort(), [logs]);
  const filtered = useMemo(() => {
    let r = logs ?? [];
    if (action !== 'all') r = r.filter((l) => l.action === action);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      r = r.filter((l) => `${l.action} ${actionLabel(l.action)} ${JSON.stringify(l.old_values)} ${JSON.stringify(l.new_values)} ${l.ip_address} ${orgName?.(l.org_id) ?? ''}`.toLowerCase().includes(n));
    }
    return r;
  }, [logs, action, q, orgName]);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(filtered)], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `audit-trail-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, values, IPs" leading={<Search />} className="md:w-72" aria-label="Search audit trail" />
        <div className="md:w-64">
          <Select aria-label="Filter by action" value={action} onValueChange={setAction} options={[{ value: 'all', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: actionLabel(a) }))]} />
        </div>
        <Button variant="secondary" className="md:ml-auto" onClick={exportCsv} disabled={!filtered.length}>
          <Download /> Export CSV
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No matching entries" description="Change the filters to see more of the trail." />
      ) : (
        <Card className="overflow-hidden">
          <ol className="divide-y divide-line">
            {filtered.map((l) => (
              <li key={l.id}>
                <button onClick={() => setOpen(l)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60">
                  <span className={cn('size-2 shrink-0 rounded-full', { accent: 'bg-accent', success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info', neutral: 'bg-faint' }[actionTone(l.action)])} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-text">{actionLabel(l.action)}</div>
                    <div className="truncate text-[12.5px] text-faint">
                      {orgName?.(l.org_id) ? `${orgName(l.org_id)} · ` : ''}
                      {l.model_type?.split('\\').pop()} {l.model_id ? `#${l.model_id}` : ''} · user #{l.user_id ?? '—'} · {l.ip_address}
                    </div>
                  </div>
                  <time className="shrink-0 text-right text-[12px] text-muted" dateTime={l.created_at} title={formatDate(l.created_at, 'd MMM yyyy HH:mm:ss')}>
                    {formatRelative(l.created_at)}
                  </time>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <p className="mt-3 text-[12px] text-faint">Showing the latest {logs?.length ?? 0} entries. Entries can’t be edited or deleted.</p>

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent title={open ? actionLabel(open.action) : ''} description={open ? formatDate(open.created_at, 'EEEE d MMMM yyyy, HH:mm:ss') : undefined}>
          {open && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone={actionTone(open.action)}>{open.action}</Badge>
                {open.model_type && (
                  <Badge>
                    {open.model_type.split('\\').pop()} #{open.model_id}
                  </Badge>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['User', open.user_id ? `#${open.user_id}` : 'System'],
                  ['Organization', orgName?.(open.org_id) ?? (open.org_id ? `#${open.org_id}` : 'Platform')],
                  ['IP address', open.ip_address],
                  ['Entry', `#${open.id}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-2 p-3">
                    <dt className="type-eyebrow-sm">{k}</dt>
                    <dd className="type-data mt-1 text-text">{v}</dd>
                  </div>
                ))}
              </dl>
              <section>
                <h3 className="type-title mb-3 text-[15px] text-text">What changed</h3>
                <Diff log={open} />
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
