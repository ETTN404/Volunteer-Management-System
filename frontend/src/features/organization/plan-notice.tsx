import { Gem, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';

/** "3 of 5 coordinators used" — turns into an upgrade prompt at the limit. */
export function PlanLimitNotice({ used, limit, label, className }: { used: number; limit: number | null; label: string; className?: string }) {
  if (limit == null) return null;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const full = used >= limit;
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm', full ? 'bg-warning-soft text-warning-text' : 'bg-surface-2 text-muted', className)}>
      <span>
        {used} of {limit} {label} used on your plan
      </span>
      <span className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
        <span className={cn('block h-full rounded-full', full ? 'bg-warning' : 'bg-accent')} style={{ width: `${pct}%` }} />
      </span>
      {full && (
        <Button asChild size="xs" className="ml-auto">
          <Link to="/o/billing">
            <Gem /> Upgrade
          </Link>
        </Button>
      )}
    </div>
  );
}

/** Wraps a feature the current plan doesn't include. */
export function PlanLocked({ locked, plan = 'Pro', children, className }: { locked: boolean; plan?: string; children: ReactNode; className?: string }) {
  if (!locked) return <>{children}</>;
  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none opacity-40 select-none" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <Link to="/o/billing" className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-xs font-medium text-text shadow-pop ring-1 ring-line hover:text-accent-text">
          <Lock className="size-3.5" /> Available on {plan}
        </Link>
      </div>
    </div>
  );
}
