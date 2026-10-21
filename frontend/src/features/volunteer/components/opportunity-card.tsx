import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { VmsEvent } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { EventStatusBadge, ProgressBar } from '@/shared/ui';
import { MatchBadge } from './match-badge';
import { OrgChip } from './org-chip';
import { useT } from '@/shared/i18n';

export function bestMatch(event: VmsEvent) {
  return Math.max(0, ...(event.shifts ?? []).map((s) => s.match_score ?? 0));
}

export function OpportunityCard({ event, appliedShiftIds, showOrg = true }: { event: VmsEvent; appliedShiftIds: Set<number>; showOrg?: boolean }) {
  const t = useT();
  const shifts = event.shifts ?? [];
  const skills = [...new Set(shifts.flatMap((s) => s.required_skills))];
  const capacity = shifts.reduce((n, s) => n + s.capacity, 0);
  const confirmed = shifts.reduce((n, s) => n + (s.confirmed_count ?? 0), 0);
  const appliedCount = shifts.filter((s) => appliedShiftIds.has(s.id)).length;
  const open = Math.max(0, capacity - confirmed);
  const brand = event.organization?.primary_color;

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] bg-surface p-5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] [box-shadow:0_1px_2px_rgba(17,21,43,0.03),0_10px_28px_-18px_rgba(17,21,43,0.18),inset_0_0_0_1px_var(--line)] hover:-translate-y-1 hover:[box-shadow:0_26px_50px_-26px_rgba(17,21,43,0.35),inset_0_0_0_1px_var(--line-strong)]">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full opacity-60 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(circle, color-mix(in oklab, ${brand ?? 'var(--accent)'} 16%, transparent), transparent 68%)` }} />
      <Link to={`/v/opportunities/${event.id}`} className="absolute inset-0 z-10 rounded-[22px]" aria-label={t('Open {title}', { title: event.title })} />
      <div className="relative flex items-start justify-between gap-3">
        <EventStatusBadge status={event.status} size="sm" />
        <div className="flex items-center gap-1.5">
          <MatchBadge score={bestMatch(event)} />
          <ArrowUpRight className="size-4 text-faint opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text group-hover:opacity-100" />
        </div>
      </div>
      <h3 className="relative mt-4 text-[18px] font-bold leading-snug tracking-[-0.02em] text-text transition-colors [font-family:var(--font-display)] wrap-anywhere group-hover:text-accent-text">{event.title}</h3>
      {showOrg && event.organization && <OrgChip org={event.organization} className="relative mt-2" />}
      {event.description && <p className="relative mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted wrap-anywhere">{event.description}</p>}
      <div className="relative mt-4 grid min-w-0 gap-2 text-[13px] text-muted">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-surface-2 text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
            <CalendarDays className="size-3.5" />
          </span>
          <span className="truncate">
            {formatDate(event.start_date, 'd MMM')}
            {event.end_date !== event.start_date && ` – ${formatDate(event.end_date, 'd MMM')}`} · {shifts.length === 1 ? t('1 shift') : t('{n} shifts', { n: shifts.length })}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-surface-2 text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
            <MapPin className="size-3.5" />
          </span>
          <span className="truncate">{event.location}</span>
        </div>
      </div>
      {skills.length > 0 && (
        <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
          {skills.slice(0, 3).map((s) => (
            <span key={s} className="max-w-full truncate rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
              {humanizeSkill(s)}
            </span>
          ))}
          {skills.length > 3 && <span className="text-[11.5px] text-faint">+{skills.length - 3}</span>}
        </div>
      )}
      <div className="relative mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 text-[12.5px]">
          {appliedCount ? (
            <span className="font-semibold text-accent-text">{t('Applied to {a} of {n}', { a: appliedCount, n: shifts.length })}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Users className="size-3.5 text-faint" /> {t('{n} open', { n: open })}
            </span>
          )}
          {capacity > 0 && <ProgressBar value={confirmed} max={capacity} tone={open === 0 ? 'danger' : 'accent'} size="sm" className="max-w-24" label={t('Shift capacity')} />}
        </div>
      </div>
    </article>
  );
}
