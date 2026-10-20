import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { VmsEvent } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { Card, EventStatusBadge } from '@/shared/ui';
import { MatchBadge } from './match-badge';
import { OrgChip } from './org-chip';

export function bestMatch(event: VmsEvent) {
  return Math.max(0, ...(event.shifts ?? []).map((s) => s.match_score ?? 0));
}

export function OpportunityCard({ event, appliedShiftIds, showOrg = true }: { event: VmsEvent; appliedShiftIds: Set<number>; showOrg?: boolean }) {
  const shifts = event.shifts ?? [];
  const skills = [...new Set(shifts.flatMap((s) => s.required_skills))];
  const capacity = shifts.reduce((n, s) => n + s.capacity, 0);
  const confirmed = shifts.reduce((n, s) => n + (s.confirmed_count ?? 0), 0);
  const appliedCount = shifts.filter((s) => appliedShiftIds.has(s.id)).length;
  const open = Math.max(0, capacity - confirmed);

  return (
    <Card interactive className="group relative flex h-full min-w-0 flex-col p-5">
      <Link to={`/v/opportunities/${event.id}`} className="absolute inset-0 z-10 rounded-lg" aria-label={`Open ${event.title}`} />
      <div className="flex items-start justify-between gap-3">
        <EventStatusBadge status={event.status} size="sm" />
        <MatchBadge score={bestMatch(event)} />
      </div>
      <h3 className="type-title mt-4 text-[17px] text-text transition-colors wrap-anywhere group-hover:text-accent-text">{event.title}</h3>
      {showOrg && event.organization && <OrgChip org={event.organization} className="mt-2" />}
      {event.description && <p className="mt-2 line-clamp-2 text-[13.5px] text-muted wrap-anywhere">{event.description}</p>}
      <div className="mt-4 min-w-0 space-y-1.5 text-[13px] text-muted">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0 text-faint" />
          <span className="truncate">
            {formatDate(event.start_date, 'd MMM')}
            {event.end_date !== event.start_date && ` – ${formatDate(event.end_date, 'd MMM')}`} · {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-faint" />
          <span className="truncate">{event.location}</span>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
        {skills.slice(0, 3).map((s) => (
          <span key={s} className="max-w-full truncate rounded-md bg-surface-2 px-2 py-1 text-[11.5px] text-muted">
            {humanizeSkill(s)}
          </span>
        ))}
        {skills.length > 3 && <span className="text-[11.5px] text-faint">+{skills.length - 3}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted">
          {appliedCount ? (
            <span className="font-medium text-accent-text">
              Applied to {appliedCount} of {shifts.length}
            </span>
          ) : (
            <>
              <Users className="size-3.5 text-faint" /> {open} open
            </>
          )}
        </span>
      </div>
    </Card>
  );
}
