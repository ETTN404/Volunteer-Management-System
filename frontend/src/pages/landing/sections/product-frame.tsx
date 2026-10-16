import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { Award, BarChart3, CalendarDays, Check, Inbox, LayoutGrid, MapPin, Radar, Search, Siren, Users } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Avatar, LogoMark } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';

const BARS = [38, 46, 41, 58, 52, 66, 61, 74, 69, 83, 79, 96];

function Kpi({ label, value, sub, bar, tone }: { label: string; value: string; sub: string; bar: number; tone: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3.5 [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]">
      <div className="text-[10.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-text" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="h-1 w-8 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full" style={{ width: `${bar}%`, background: tone }} />
        </span>
        <span className="text-[10px] text-faint">{sub}</span>
      </div>
    </div>
  );
}

/** Floating "live event" chip around the product frame. */
export function FloatCard({ icon, title, sub, tone, className, delay = 0 }: { icon: ReactNode; title: string; sub: string; tone: 'green' | 'gold' | 'coral'; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const toneCls = { green: 'bg-success-soft text-success-text', gold: 'bg-gold-soft text-warning-text', coral: 'bg-coral-soft text-danger-text' }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.9 + delay, ease: EASE_OUT_EXPO }}
      className={cn('absolute z-20 hidden md:block', className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center gap-3 rounded-2xl bg-surface/95 py-2.5 pl-2.5 pr-4 backdrop-blur [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)]"
      >
        <span className={cn('grid size-9 place-items-center rounded-xl [&_svg]:size-[18px]', toneCls)}>{icon}</span>
        <span>
          <span className="block text-[13px] font-semibold text-text">{title}</span>
          <span className="block text-[11.5px] text-muted">{sub}</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

const NAV = [
  [LayoutGrid, 'Operations', true],
  [CalendarDays, 'Events', false],
  [Inbox, 'Applications', false],
  [Radar, 'Live shifts', false],
  [Users, 'Volunteers', false],
  [Award, 'Certificates', false],
  [BarChart3, 'Impact reports', false],
] as const;

const ROSTER = [
  ['Hana Tesfaye', '07:52', 'in'],
  ['Dawit Bekele', '07:58', 'in'],
  ['Meron Alemu', '08:06', 'late'],
  ['Yonas Girma', '—', 'due'],
] as const;

/** A believable coordinator dashboard — the hero's proof that the product is real. */
export function ProductFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 25%'] });
  const rotate = useSpring(useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 14, 0]), { stiffness: 120, damping: 24 });
  const scale = useSpring(useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.94, 1]), { stiffness: 120, damping: 24 });

  return (
    <div ref={ref} className="relative mx-auto mt-16 max-w-[1080px] [perspective:1800px] sm:mt-20">
      <FloatCard className="-left-10 top-24" icon={<MapPin />} tone="green" title="Check-in verified" sub="Hana T. · 32 m from the venue" />
      <FloatCard className="-right-12 top-44" icon={<Award />} tone="gold" title="Certificate issued" sub="Dawit B. · 50 verified hours" delay={0.25} />
      <FloatCard className="-left-6 bottom-16" icon={<Siren />} tone="coral" title="Urgent shift filled" sub="Kit assembly · 12 of 12 spots" delay={0.5} />

      <motion.div
        style={{ rotateX: rotate, scale }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.45, ease: EASE_OUT_EXPO }}
        className="relative origin-top overflow-hidden rounded-[22px] bg-surface-2 [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line-strong)]"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">
            <span className="size-1.5 rounded-full bg-success" /> app.voluntrack.org/coordinator
          </div>
          <div className="w-12" />
        </div>

        <div className="grid grid-cols-[180px_minmax(0,1fr)] max-md:grid-cols-1">
          {/* Sidebar */}
          <aside className="border-r border-line bg-surface p-3 max-md:hidden">
            <div className="mb-4 flex items-center gap-2 px-1.5">
              <LogoMark className="size-7" />
              <div>
                <div className="text-[11.5px] font-semibold text-text">Addis Relief</div>
                <div className="text-[9.5px] uppercase tracking-wider text-faint">Coordinator</div>
              </div>
            </div>
            {NAV.map(([Icon, label, active]) => (
              <div key={label} className={cn('mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium', active ? 'bg-accent-soft text-accent-text' : 'text-muted')}>
                <Icon className="size-3.5" />
                {label}
                {label === 'Applications' && <span className="ml-auto rounded-full bg-gold-soft px-1.5 text-[10px] font-semibold text-warning-text">14</span>}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[10.5px] text-muted">Saturday, 17 October</div>
                <div className="text-[18px] font-bold tracking-[-0.03em] text-text" style={{ fontFamily: 'var(--font-display)' }}>
                  Good morning, Mekdes
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[11px] text-faint [box-shadow:inset_0_0_0_1px_var(--line)] max-sm:hidden">
                <Search className="size-3" /> Search volunteers, events…
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Kpi label="On site now" value="23" sub="across 3 venues" bar={72} tone="var(--success)" />
              <Kpi label="Shifts today" value="6" sub="2 live" bar={45} tone="var(--accent)" />
              <Kpi label="Applications" value="14" sub="to review" bar={58} tone="var(--gold)" />
              <Kpi label="Hours · October" value="912" sub="+18% vs Sept" bar={84} tone="var(--coral)" />
            </div>

            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="rounded-2xl bg-surface p-4 [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold text-text">Verified hours</span>
                  <span className="text-[10px] text-faint">last 12 weeks</span>
                </div>
                <div className="flex h-[132px] items-end gap-1.5">
                  {BARS.map((h, i) => (
                    <motion.span
                      key={i}
                      className={cn('flex-1 rounded-t-[5px]', i === BARS.length - 1 ? 'bg-sunrise' : 'bg-accent/15')}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1 + i * 0.05, duration: 0.8, ease: EASE_OUT_EXPO }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-surface p-4 [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-text">Live · Meskel Square</span>
                  <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success-text">
                    <span className="size-1.5 animate-pulse rounded-full bg-success" /> 8/12
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {ROSTER.map(([n, t, s]) => (
                    <li key={n} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-1.5">
                      <Avatar name={n} size="xs" />
                      <span className="flex-1 truncate text-[11.5px] font-medium text-text">{n}</span>
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          s === 'in' ? 'bg-success-soft text-success-text' : s === 'late' ? 'bg-gold-soft text-warning-text' : 'bg-surface text-faint',
                        )}
                      >
                        {s === 'in' && <Check className="size-2.5" strokeWidth={3} />}
                        {s === 'due' ? 'Expected' : t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Reflection glow */}
      <div className="pointer-events-none absolute -bottom-16 left-1/2 -z-10 h-40 w-3/4 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
    </div>
  );
}
