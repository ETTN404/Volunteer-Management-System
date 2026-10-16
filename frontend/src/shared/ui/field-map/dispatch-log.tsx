import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';

export interface DispatchEntry {
  id: string;
  time: string;
  place: string;
  message: string;
  tone: 'success' | 'danger' | 'accent' | 'muted';
}

const toneClass = {
  success: 'text-success-text',
  danger: 'text-danger-text',
  accent: 'text-accent-text',
  muted: 'text-muted',
};

/** Monospace live feed — reads like a field radio log. */
export function DispatchLog({ entries, className, max = 6 }: { entries: DispatchEntry[]; className?: string; max?: number }) {
  return (
    <div className={cn('type-data overflow-hidden text-[11.5px] leading-relaxed', className)} aria-live="off">
      <ul className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {entries.slice(0, max).map((e, i) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1 - i * 0.13, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-0 gap-3 whitespace-nowrap"
            >
              <span className="text-faint">{e.time}</span>
              <span className={cn('shrink-0', toneClass[e.tone])}>●</span>
              <span className="truncate text-text">{e.place}</span>
              <span className={cn('truncate', toneClass[e.tone])}>{e.message}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
