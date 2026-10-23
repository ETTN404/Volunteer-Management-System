/**
 * Premium building blocks shared by every role:
 * StatTile (hue + corner glow), FilterChips + DistributionBar, Stepper, IconTile, HeroBand.
 */
import { ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { CountUp } from '@/shared/motion';
import { Skeleton } from './skeleton';

export type Hue = 'indigo' | 'sky' | 'rose' | 'amber' | 'emerald' | 'violet';
export const HUES: Hue[] = ['indigo', 'rose', 'amber', 'emerald', 'sky', 'violet'];

/** CSS vars --h (strong) and --hs (soft) for a hue; use with bg-[var(--hs)] text-[var(--h)]. */
export const hueVars = (hue: Hue): CSSProperties => ({ ['--h' as string]: `var(--hue-${hue})`, ['--hs' as string]: `var(--hue-${hue}-soft)` });

export function IconTile({ hue = 'indigo', children, className, size = 'md' }: { hue?: Hue; children: ReactNode; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      style={hueVars(hue)}
      className={cn(
        'grid shrink-0 place-items-center bg-[var(--hs)] text-[var(--h)] [box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--h)_14%,transparent)]',
        size === 'sm' ? 'size-8 rounded-[10px] [&_svg]:size-4' : size === 'lg' ? 'size-12 rounded-[15px] [&_svg]:size-[22px]' : 'size-11 rounded-[14px] [&_svg]:size-5',
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface StatTileProps {
  icon: ReactNode;
  label: ReactNode;
  value: number | undefined | null;
  hue?: Hue;
  hint?: ReactNode;
  suffix?: ReactNode;
  decimals?: number;
  to?: string;
  className?: string;
}

/** Metric card: tinted icon tile, label, big number, coloured legend line + hint, soft corner glow. */
export function StatTile({ icon, label, value, hue = 'indigo', hint, suffix, decimals = 0, to, className }: StatTileProps) {
  const body = (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--h)_22%,transparent),transparent_68%)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <IconTile hue={hue}>{icon}</IconTile>
        {to && <ArrowUpRight className="size-4 text-faint opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--h)] group-hover:opacity-100" />}
      </div>
      <div className="relative mt-4 line-clamp-2 text-[13.5px] font-medium leading-snug text-muted sm:text-[14px]">{label}</div>
      <div className="relative mt-1 flex items-baseline gap-1 text-[clamp(1.75rem,3.2vw,2.25rem)] font-extrabold leading-none tracking-[-0.03em] text-text tabular-nums [font-family:var(--font-display)]">
        {value == null ? <Skeleton className="h-9 w-20" /> : <CountUp value={value} decimals={decimals} />}
        {value != null && suffix && <span className="text-[15px] font-semibold text-faint">{suffix}</span>}
      </div>
      {hint && (
        <div className="relative mt-3 flex min-w-0 items-start gap-2 text-[12.5px] leading-snug text-muted">
          <span className="mt-[0.5em] h-[3px] w-5 shrink-0 rounded-full bg-[var(--h)]" />
          <span className="line-clamp-2">{hint}</span>
        </div>
      )}
    </>
  );
  const cls = cn(
    'group relative block min-w-0 overflow-hidden rounded-[22px] bg-surface p-5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-expo)]',
    '[box-shadow:0_1px_2px_rgba(17,21,43,0.03),0_10px_28px_-18px_rgba(17,21,43,0.18),inset_0_0_0_1px_var(--line)]',
    to && 'hover:-translate-y-1 hover:[box-shadow:0_24px_48px_-22px_color-mix(in_oklab,var(--h)_55%,transparent),inset_0_0_0_1px_color-mix(in_oklab,var(--h)_28%,var(--line))]',
    className,
  );
  return to ? (
    <Link to={to} className={cls} style={hueVars(hue)}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={hueVars(hue)}>
      {body}
    </div>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  hue?: Hue;
}

/** Status filter: dark pill for the active one, coloured dot + count badge for the rest. */
export function FilterChips<T extends string>({ value, onChange, options, className, 'aria-label': ariaLabel }: { value: T; onChange: (v: T) => void; options: ChipOption<T>[]; className?: string; 'aria-label'?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('-mx-1 flex flex-wrap items-center gap-1.5 px-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={o.hue ? hueVars(o.hue) : undefined}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full pl-3.5 pr-1.5 text-[13.5px] font-medium transition-all duration-200',
              on ? 'bg-text text-bg shadow-[0_6px_16px_-8px_rgba(17,21,43,0.55)]' : 'text-muted hover:bg-surface-2 hover:text-text',
              o.count == null && 'pr-3.5',
            )}
          >
            {!on && o.hue && <span className="size-2 rounded-full bg-[var(--h)]" />}
            {o.label}
            {o.count != null && (
              <span className={cn('type-data min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11.5px]', on ? 'bg-bg/20 text-bg' : 'bg-surface-2 text-text [box-shadow:inset_0_0_0_1px_var(--line)]')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Thin stacked bar showing how a total splits across statuses. */
export function DistributionBar({ segments, className, label }: { segments: { value: number; hue: Hue; label?: string }[]; className?: string; label?: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div role="img" aria-label={label ?? segments.map((s) => `${s.label ?? s.hue}: ${s.value}`).join(', ')} className={cn('flex h-2 w-full gap-1 overflow-hidden rounded-full', className)}>
      {total === 0 ? (
        <span className="h-full w-full rounded-full bg-line" />
      ) : (
        segments
          .filter((s) => s.value > 0)
          .map((s, i) => <span key={i} style={{ ...hueVars(s.hue), flexGrow: s.value }} className="h-full min-w-1.5 rounded-full bg-[var(--h)] transition-[flex-grow] duration-700" title={s.label} />)
      )}
    </div>
  );
}

/** Process stepper: done steps green ✓, current amber ring, upcoming faint. */
export function Stepper({ steps, current, tone = 'amber', className }: { steps: ReactNode[]; current: number; tone?: Hue | 'danger'; className?: string }) {
  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={i} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn('absolute right-1/2 top-[13px] h-[2px] w-full -translate-x-[14px]', i <= current ? 'bg-success' : 'bg-line')} />}
            <span
              className={cn(
                'relative z-10 grid size-7 place-items-center rounded-full text-white transition-colors',
                done ? 'bg-success' : now ? (tone === 'danger' ? 'bg-danger' : 'bg-[var(--h)] ring-4 ring-[var(--hs)]') : 'bg-surface ring-1 ring-line-strong',
              )}
              style={now && tone !== 'danger' ? hueVars(tone) : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3.5} /> : now ? <span className="size-2 rounded-full bg-white" /> : <span className="size-1.5 rounded-full bg-line-strong" />}
            </span>
            <span className={cn('mt-2 px-1 text-[12px] font-medium leading-tight', done || now ? 'text-text' : 'text-faint')}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Brand-coloured band with a dotted texture — the top of a dashboard. */
export function HeroBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[24px] bg-accent p-6 text-accent-fg sm:p-8',
        '[box-shadow:0_24px_48px_-28px_color-mix(in_oklab,var(--accent)_70%,transparent)]',
        className,
      )}
    >
      <span aria-hidden className="absolute inset-0 -z-10 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:18px_18px] [mask-image:linear-gradient(100deg,transparent_10%,black_60%)]" />
      <span aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/15 blur-3xl" />
      <span aria-hidden className="absolute -bottom-28 left-1/3 -z-10 size-72 rounded-full bg-[var(--hue-rose)]/30 blur-3xl" />
      {children}
    </div>
  );
}

/** Glass pill button for use on a HeroBand. */
export const heroPill =
  'inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-[13.5px] font-semibold text-current backdrop-blur transition-colors hover:bg-white/25 [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.22)] [&_svg]:size-4';
