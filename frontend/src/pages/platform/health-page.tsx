import { Activity, CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { formatRelative } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton } from '@/shared/ui';
import { usePlatformHealth } from '@/features/platform/api';

const TITLES: Record<string, { title: string; what: string }> = {
  database: { title: 'Database', what: 'Can we read and write data, and how fast.' },
  cache: { title: 'Cache', what: 'Used for locks that stop double check-ins from two phones.' },
  queue: { title: 'Background jobs', what: 'Certificates and alerts that run after a request.' },
  mail: { title: 'Email delivery', what: 'Invitations, password resets and notification emails.' },
  frontend_url: { title: 'App address for emails', what: 'Links inside emails point here.' },
  maintenance: { title: 'Automatic check-out & event status', what: 'Closes forgotten check-outs and moves events to live/completed.' },
  payment_verification: { title: 'Payment verification', what: 'Automatic receipt checks with telebirr / banks.' },
  storage: { title: 'File storage', what: 'Photos, logos and documents (kept in the database).' },
};

function detail(key: string, c: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (c.driver) out.push(`driver: ${String(c.driver)}`);
  if (c.latency_ms != null) out.push(`${String(c.latency_ms)} ms`);
  if (c.failed_jobs != null) out.push(`${String(c.failed_jobs)} failed jobs`);
  if (c.last_run) out.push(`last run ${formatRelative(String(c.last_run))}`);
  if (c.open_attendances != null) out.push(`${String(c.open_attendances)} people on shift`);
  if (c.stored_files != null) out.push(`${String(c.stored_files)} files · ${String(c.stored_mb)} MB`);
  if (key === 'frontend_url' && c.value) out.push(String(c.value));
  if (key === 'payment_verification' && c.drivers) {
    for (const [d, v] of Object.entries(c.drivers as Record<string, { configured: boolean; last: { ok: boolean; at: string; ms: number; error?: string } | null }>)) {
      out.push(`${d}: ${v.configured ? (v.last ? `${v.last.ok ? 'answered' : 'failed'} ${formatRelative(v.last.at)} (${v.last.ms} ms)` : 'not used yet') : 'no API key'}`);
    }
    out.push(c.receiver_check ? 'receiving account is checked' : 'set PAY_ACCOUNT_NAME / PAY_RECEIVER_ACCOUNT_SUFFIX');
  }
  if (c.error) out.push(String(c.error));
  if (c.note) out.push(String(c.note));
  return out;
}

export default function HealthPage() {
  const health = usePlatformHealth();
  useEffect(() => {
    document.title = 'System health · VolunTrack';
  }, []);
  const h = health.data;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="System health"
        description="Live checks of everything VolunTrack depends on. Refreshes every minute."
        actions={
          <Button variant="secondary" onClick={() => health.refetch()} loading={health.isFetching}>
            <RefreshCw /> Check now
          </Button>
        }
      />
      {health.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : health.error || !h ? (
        <ErrorState error={health.error} onRetry={() => health.refetch()} />
      ) : (
        <>
          <Card className={cn('mb-6 flex items-center gap-4 p-5', h.ok ? 'bg-success-soft' : 'bg-warning-soft')}>
            {h.ok ? <CheckCircle2 className="size-8 text-success-text" /> : <CircleAlert className="size-8 text-warning-text" />}
            <div>
              <div className="type-title text-lg text-text">{h.ok ? 'All systems normal' : 'Some things need attention'}</div>
              <div className="text-sm text-muted">
                {h.app.env} · PHP {h.app.php} · Laravel {h.app.laravel}
                {h.app.debug && ' · debug mode is ON (turn off in production)'}
              </div>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(h.checks).map(([key, c]) => (
              <Card key={key} className="p-5">
                <div className="flex items-start gap-3">
                  <Activity className={cn('mt-0.5 size-5 shrink-0', c.ok ? 'text-success-text' : 'text-warning-text')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-text">{TITLES[key]?.title ?? key}</h2>
                      <Badge size="sm" tone={c.ok ? 'success' : 'warning'} className="ml-auto">
                        {c.ok ? 'OK' : 'Check'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-faint">{TITLES[key]?.what}</p>
                    <ul className="mt-2 space-y-0.5 text-[13px] text-muted">
                      {detail(key, c).map((line) => (
                        <li key={line} className="wrap-anywhere">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
