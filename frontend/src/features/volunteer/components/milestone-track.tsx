import { motion } from 'motion/react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { CERTIFICATE_MILESTONES } from '@/shared/lib/skills';
import { EASE_OUT_EXPO } from '@/shared/motion';

/** 10 → 500 hour milestones on a logarithmic-feeling track (evenly spaced stops). */
export function MilestoneTrack({ hours, className }: { hours: number; className?: string }) {
  const stops = CERTIFICATE_MILESTONES;
  const idx = stops.findIndex((m) => m > hours);
  const reached = idx === -1 ? stops.length : idx;
  const prev = reached === 0 ? 0 : stops[reached - 1]!;
  const next = stops[reached];
  const segment = next ? (hours - prev) / (next - prev) : 1;
  const progress = Math.min(1, (reached - 1 + (next ? segment : 1)) / (stops.length - 1));
  const pct = Math.max(0, progress) * 100;

  return (
    <div className={cn('relative px-3 pb-8 pt-2', className)}>
      <div className="relative h-1.5 rounded-full bg-line">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: EASE_OUT_EXPO }} />
      </div>
      {stops.map((m, i) => {
        const done = hours >= m;
        return (
          <div key={m} className="absolute top-0 -translate-x-1/2" style={{ left: `calc(12px + (100% - 24px) * ${i / (stops.length - 1)})` }}>
            <span className={cn('grid size-5 place-items-center rounded-full ring-4 ring-surface', done ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-faint shadow-[inset_0_0_0_1px_var(--line-strong)]')}>
              {done ? <Check className="size-3" strokeWidth={3.5} /> : <Lock className="size-2.5" />}
            </span>
            <span className={cn('type-data absolute left-1/2 top-7 -translate-x-1/2 text-[11px]', done ? 'text-text' : 'text-faint')}>{m}h</span>
          </div>
        );
      })}
    </div>
  );
}
