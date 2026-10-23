import { motion } from 'motion/react';
import { ArrowUpRight, CalendarClock, Check, MapPin, Navigation, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatDay, formatTimeRange } from '@/shared/lib/time';
import { useT } from '@/shared/i18n';
import type { ChatShiftCard } from '@/shared/types/api';

export const ETHIOPIC = /[ሀ-፿]/;

/** The VolunBot mark — a turning aurora orb. Spins faster while thinking. */
export function BotOrb({ size = 36, thinking, glow, className }: { size?: number; thinking?: boolean; glow?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} aria-hidden>
      {glow && <span className="vb-orb-glow" />}
      <span className="vb-orb size-full" data-thinking={thinking ? 'true' : 'false'} />
    </span>
  );
}

/** Safe, tiny markdown: **bold**, *italic*, bullet and numbered lists, paragraphs. No HTML. */
export function RichText({ text }: { text: string }) {
  const blocks: { kind: 'p' | 'ul' | 'ol'; lines: string[] }[] = [];
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•]|•)\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const kind = bullet ? 'ul' : num ? 'ol' : 'p';
    const content = bullet?.[1] ?? num?.[1] ?? line;
    const last = blocks[blocks.length - 1];
    if (!content.trim()) {
      blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    if (last && last.kind === kind && (kind !== 'p' || last.lines.length)) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.kind === 'p' ? (
            <p key={i}>
              {b.lines.map((l, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} />
                </span>
              ))}
            </p>
          ) : (
            <ul key={i} className={'space-y-1.5'}>
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  {b.kind === 'ul' ? (
                    <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent" />
                  ) : (
                    <span className="type-data mt-[0.1em] grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text">{j + 1}</span>
                  )}
                  <span className="min-w-0">
                    <Inline text={l} />
                  </span>
                </li>
              ))}
            </ul>
          ),
        )}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i} className="font-semibold text-text">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function MatchRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const tone = value >= 80 ? 'var(--hue-emerald)' : value >= 50 ? 'var(--hue-amber)' : 'var(--hue-rose)';
  return (
    <span className="relative grid size-10 shrink-0 place-items-center" title={`${value}% skill match`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="3.5" />
        <motion.circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <span className="type-data text-[10.5px] font-bold text-text">{value}%</span>
    </span>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-success-soft text-success-text' },
  pending: { label: 'Applied', cls: 'bg-warning-soft text-warning-text' },
  waitlisted: { label: 'Waitlist', cls: 'bg-info-soft text-info-text' },
};

/** A shift VolunBot talked about — tap to open it. */
export function ShiftCard({ card, index = 0 }: { card: ChatShiftCard; index?: number }) {
  const t = useT();
  const left = Math.max(0, card.capacity - card.confirmed);
  const fill = card.capacity ? Math.min(100, (card.confirmed / card.capacity) * 100) : 0;
  const color = card.org_color || 'var(--accent)';
  const status = card.my_status ? STATUS[card.my_status] : null;
  const to = card.my_status ? '/v/schedule' : `/v/opportunities/${card.event_id}`;

  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }} className="w-[272px] shrink-0 snap-start sm:w-[288px] lg:w-auto">
      <Link
        to={to}
        className="group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-surface p-4 [box-shadow:0_14px_34px_-22px_rgba(17,21,43,0.45),inset_0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:[box-shadow:0_22px_40px_-22px_rgba(17,21,43,0.5),inset_0_0_0_1px_var(--line-strong)]"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.13]" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
              <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
              <span className="truncate">{card.organization ?? 'VolunTrack'}</span>
            </div>
            <div className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em] text-text [font-family:var(--font-display)]">{card.event_title}</div>
            {card.shift_title && <div className="mt-0.5 truncate text-[12.5px] text-muted">{card.shift_title}</div>}
          </div>
          {status ? (
            <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', status.cls)}>{t(status.label)}</span>
          ) : card.match != null ? (
            <MatchRing value={card.match} />
          ) : null}
        </div>

        <div className="relative mt-3.5 flex flex-wrap gap-1.5">
          <Chip icon={<CalendarClock />}>
            {formatDay(card.start_time)} · {formatTimeRange(card.start_time, card.end_time)}
          </Chip>
          {card.distance_km != null ? (
            <Chip icon={<Navigation />} tone="accent">
              {card.distance_km < 1 ? `${Math.round(card.distance_km * 1000)} m` : `${card.distance_km} km`}
            </Chip>
          ) : card.location ? (
            <Chip icon={<MapPin />}>{card.location}</Chip>
          ) : null}
        </div>

        {card.reasons && card.reasons.length > 0 && (
          <ul className="relative mt-3 space-y-1">
            {card.reasons.slice(0, 2).map((r) => (
              <li key={r} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={3} />
                <span className="first-letter:uppercase">{r}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="relative mt-auto pt-4">
          <div className="flex items-center justify-between text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {left > 0 ? t('{n} of {c} places left', { n: left, c: card.capacity }) : t('Full · waitlist open')}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-accent-text">
              {t('Open')}
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full" style={{ background: left <= 2 ? 'var(--hue-amber)' : color }} initial={{ width: 0 }} animate={{ width: `${fill}%` }} transition={{ duration: 0.9, delay: 0.25 }} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Chip({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone?: 'accent' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium [&_svg]:size-3.5 [&_svg]:shrink-0',
        tone === 'accent' ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-muted',
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

const STEPS = ['Reading your profile', 'Checking your schedule', 'Ranking open shifts', 'Measuring distances', 'Writing a reply'];

/** "Thinking" row with the steps VolunBot actually takes on the server. */
export function Thinking({ withLocation }: { withLocation?: boolean }) {
  const t = useT();
  const steps = withLocation ? STEPS : STEPS.filter((s) => s !== 'Measuring distances');
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 1300);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3" role="status" aria-label={t('VolunBot is thinking')}>
      <BotOrb size={30} thinking />
      <div className="relative overflow-hidden rounded-full bg-surface-2 px-4 py-2 text-[13px] font-medium text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
        <motion.span key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
          {t(steps[i]!)}…
        </motion.span>
        <span className="pointer-events-none absolute inset-0 animate-[shimmer_1.6s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:200%_100%]" />
      </div>
    </motion.div>
  );
}
