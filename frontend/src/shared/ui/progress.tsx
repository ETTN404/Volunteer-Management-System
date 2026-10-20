import { motion, useReducedMotion } from 'motion/react';
import { useT } from '@/shared/i18n';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'muted';
const stroke: Record<Tone, string> = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  muted: 'var(--text-faint)',
};

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  className,
  label,
  size = 'md',
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  const reduce = useReducedMotion();
  return (
    <div
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn('relative w-full overflow-hidden rounded-full bg-line', size === 'sm' ? 'h-1' : 'h-1.5', className)}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: stroke[tone] }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Capacity meter: confirmed/total with tone shifting as the shift fills. */
export function CapacityMeter({ confirmed, capacity, className, showLabel = true }: { confirmed: number | undefined; capacity: number; className?: string; showLabel?: boolean }) {
  const t = useT();
  if (confirmed === undefined) {
    return <div className={cn('text-xs text-muted', className)}>{t('Up to {n} volunteers', { n: capacity })}</div>;
  }
  const ratio = capacity ? confirmed / capacity : 0;
  const tone: Tone = ratio >= 1 ? 'danger' : ratio >= 0.75 ? 'warning' : 'success';
  const left = Math.max(0, capacity - confirmed);
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="type-data text-text">
            {confirmed}
            <span className="text-faint">/{capacity}</span>
          </span>
          <span className={cn('font-medium', ratio >= 1 ? 'text-danger-text' : ratio >= 0.75 ? 'text-warning-text' : 'text-muted')}>
            {ratio >= 1 ? t('Full') : left === 1 ? t('1 spot left') : t('{n} spots left', { n: left })}
          </span>
        </div>
      )}
      <ProgressBar value={confirmed} max={capacity} tone={tone} size="sm" label={t('Shift capacity')} />
    </div>
  );
}

/** Concentric ring — echoes the geofence motif. */
export function ProgressRing({
  value,
  max = 100,
  size = 120,
  thickness = 8,
  tone = 'accent',
  children,
  className,
  label,
  ticks,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
  label?: string;
  ticks?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / Math.max(max, 1)));
  const reduce = useReducedMotion();
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {ticks &&
          Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * 2 * Math.PI;
            const r1 = r + thickness / 2 + 3;
            const r2 = r1 + 3;
            return (
              <line
                key={i}
                x1={size / 2 + r1 * Math.cos(a)}
                y1={size / 2 + r1 * Math.sin(a)}
                x2={size / 2 + r2 * Math.cos(a)}
                y2={size / 2 + r2 * Math.sin(a)}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
            );
          })}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${stroke[tone]} 45%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
