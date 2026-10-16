import { cn } from '@/shared/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg bg-surface p-5 [box-shadow:inset_0_0_0_1px_var(--line)]', className)} aria-hidden>
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="mb-3 h-6 w-2/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

/** Screen-reader announcement for loading regions. */
export function LoadingRegion({ label = 'Loading', children }: { label?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
