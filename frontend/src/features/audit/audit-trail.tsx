import { ArrowRight, ChevronLeft, ChevronRight, Download, ScrollText } from 'lucide-react';
import { useState } from 'react';
import type { AuditLog, Paginated } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, DateRangePicker, EmptyState, ErrorState, Select, Sheet, SheetContent, Skeleton, notify } from '@/shared/ui';

export interface AuditFilters {
  page: number;
  action: string;
  from: string;
  to: string;
  org_id?: number | '';
}

const GROUPS = [
  { value: '', label: 'All actions' },
  { value: 'tenant.', label: 'Organizations' },
  { value: 'user.', label: 'Staff accounts' },
  { value: 'volunteer.', label: 'Volunteers' },
  { value: 'event.', label: 'Events' },
  { value: 'shift.', label: 'Shifts' },
  { value: 'application.', label: 'Applications' },
  { value: 'attendance.', label: 'Attendance & hours' },
  { value: 'document.', label: 'Documents' },
  { value: 'payment.', label: 'Payments' },
  { value: 'announcement.', label: 'Announcements' },
];

const tone = (a: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' =>
  /deleted|rejected|deactivated|removed|suspend/.test(a) ? 'danger' : /created|verified|approved|onboard|signed_up|activated/.test(a) ? 'success' : /status|adjust|manual/.test(a) ? 'warning' : 'info';

function Changes({ log }: { log: AuditLog }) {
  const changes = log.changes ?? [];
  if (changes.length === 0) return <p className="text-sm text-muted">No field changes recorded for this action.</p>;
  return (
    <dl className="space-y-2">
      {changes.map((c) => (
        <div key={c.field} className="rounded-lg bg-surface-2 p-3">
          <dt className="type-eyebrow-sm mb-1.5">{c.field}</dt>
          <dd className="flex flex-wrap items-center gap-2 text-[13px]">
            {c.from !== '—' && <span className="text-danger-text line-through decoration-danger/40">{c.from}</span>}
            {c.from !== '—' && <ArrowRight className="size-3.5 text-faint" />}
            <span className="text-success-text">{c.to}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditTrail({
  data,
  isLoading,
  error,
  onRetry,
  filters,
  onFilters,
  exportCsv,
  showOrg = false,
  orgOptions,
}: {
  data?: Paginated<AuditLog>;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  filters: AuditFilters;
  onFilters: (f: AuditFilters) => void;
  exportCsv: () => Promise<Blob>;
  showOrg?: boolean;
  orgOptions?: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const logs = data?.items ?? [];
  const pg = data?.pagination;

  const doExport = async () => {
    setExporting(true);
    try {
      const blob = await exportCsv();
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `audit-trail-${new Date().toISOString().slice(0, 10)}.csv` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-56">
          <Select aria-label="Filter by action" value={filters.action || 'all'} onValueChange={(v) => onFilters({ ...filters, action: v === 'all' ? '' : v, page: 1 })} options={GROUPS.map((g) => ({ value: g.value || 'all', label: g.label }))} />
        </div>
        {showOrg && orgOptions && (
          <div className="lg:w-56">
            <Select
              aria-label="Filter by organization"
              value={filters.org_id ? String(filters.org_id) : 'all'}
              onValueChange={(v) => onFilters({ ...filters, org_id: v === 'all' ? '' : Number(v), page: 1 })}
              options={[{ value: 'all', label: 'All organizations' }, ...orgOptions]}
            />
          </div>
        )}
        <div className="lg:w-72">
          <DateRangePicker value={{ from: filters.from, to: filters.to }} onChange={(r) => onFilters({ ...filters, ...r, page: 1 })} placeholder="Any date" />
        </div>
        <div className="flex gap-2 lg:ml-auto">
          {(filters.action || filters.from || filters.org_id) && (
            <Button variant="ghost" size="sm" onClick={() => onFilters({ page: 1, action: '', from: '', to: '', org_id: '' })}>
              Clear
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={doExport} loading={exporting}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : logs.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No matching activity" description="Change the filters or check back after something happens." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setOpen(l)} className="flex w-full flex-col gap-2 px-5 py-3.5 text-left hover:bg-surface-2/60 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={l.actor?.name ?? 'System'} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-text">{l.actor?.name ?? 'System'}</span>
                        <Badge size="sm" tone={tone(l.action)}>
                          {l.action_label ?? l.action}
                        </Badge>
                      </div>
                      <div className="truncate text-[12.5px] text-muted">
                        {[l.target_type, l.target_label].filter(Boolean).join(' · ')}
                        {showOrg && l.organization ? ` · ${l.organization}` : ''}
                        {l.changes?.length ? ` · ${l.changes.map((c) => `${c.field}: ${c.to}`).join(', ')}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] text-faint" title={formatDate(l.created_at, 'd MMM yyyy HH:mm:ss')}>
                    {formatRelative(l.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pg && pg.last_page > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button size="sm" variant="secondary" disabled={pg.current_page <= 1} onClick={() => onFilters({ ...filters, page: pg.current_page - 1 })}>
            <ChevronLeft /> Newer
          </Button>
          <span className="type-data text-sm text-muted">
            {pg.current_page} / {pg.last_page} · {pg.total} entries
          </span>
          <Button size="sm" variant="secondary" disabled={pg.current_page >= pg.last_page} onClick={() => onFilters({ ...filters, page: pg.current_page + 1 })}>
            Older <ChevronRight />
          </Button>
        </div>
      )}

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent title={open?.action_label ?? 'Activity'} description={open ? formatDate(open.created_at, 'EEEE d MMMM yyyy · HH:mm:ss') : undefined}>
          {open && (
            <div className="space-y-5 text-sm">
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
                <dt className="text-faint">Done by</dt>
                <dd className="text-text">
                  {open.actor ? `${open.actor.name} (${open.actor.role})` : 'System'}
                  {open.actor?.email && <div className="text-xs text-muted">{open.actor.email}</div>}
                </dd>
                <dt className="text-faint">Organization</dt>
                <dd className="text-text">{open.organization ?? 'Platform'}</dd>
                <dt className="text-faint">Target</dt>
                <dd className="text-text">{[open.target_type, open.target_label].filter(Boolean).join(' · ') || '—'}</dd>
                <dt className="text-faint">IP address</dt>
                <dd className={cn('type-data text-text')}>{open.ip_address}</dd>
                {open.user_agent && (
                  <>
                    <dt className="text-faint">Device</dt>
                    <dd className="truncate text-xs text-muted" title={open.user_agent}>
                      {open.user_agent}
                    </dd>
                  </>
                )}
              </dl>
              <div>
                <div className="type-eyebrow mb-2">What changed</div>
                <Changes log={open} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Fallback label when the server didn't send `action_label`. */
export const actionLabel = (a: string) => a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
