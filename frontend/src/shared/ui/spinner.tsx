import { cn } from '@/shared/lib/cn';

/** A geofence ring that sweeps — the loading glyph of the system. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 animate-spin', className)} role="status" aria-label={label}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
