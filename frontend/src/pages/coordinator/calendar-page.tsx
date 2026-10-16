import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { parseApiDate, toApiDateTime } from '@/shared/lib/time';
import { Button, ErrorState, PageHeader, Skeleton, notify } from '@/shared/ui';
import { useAllOrgEvents, useUpdateShift } from '@/features/operations/api';
import type { Shift, VmsEvent } from '@/shared/types/api';

type Item = { s: Shift; e: VmsEvent; start: Date; end: Date };

function tone(s: Shift) {
  const ratio = s.capacity ? (s.confirmed_count ?? 0) / s.capacity : 0;
  if (ratio >= 1) return 'bg-danger-soft text-danger-text [box-shadow:inset_3px_0_0_var(--danger)]';
  if (ratio < 0.5) return 'bg-warning-soft text-warning-text [box-shadow:inset_3px_0_0_var(--warning)]';
  return 'bg-success-soft text-success-text [box-shadow:inset_3px_0_0_var(--success)]';
}

export default function CalendarPage() {
  const events = useAllOrgEvents();
  const update = useUpdateShift();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Calendar · VolunTrack';
  }, []);

  const items = useMemo<Item[]>(
    () => (events.data ?? []).flatMap((e) => (e.shifts ?? []).map((s) => ({ s, e, start: parseApiDate(s.start_time)!, end: parseApiDate(s.end_time)! }))),
    [events.data],
  );
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const onDrop = (day: Date, ev: DragEvent) => {
    ev.preventDefault();
    setDragOver(null);
    const id = Number(ev.dataTransfer.getData('text/shift'));
    const it = items.find((x) => x.s.id === id);
    if (!it || isSameDay(it.start, day)) return;
    const dayStr = format(day, 'yyyy-MM-dd');
    if (dayStr < it.e.start_date || dayStr > it.e.end_date) {
      notify.warning('Outside the event dates', `${it.e.title} runs ${it.e.start_date} – ${it.e.end_date}.`);
      return;
    }
    const shift = (d: Date) => {
      const n = new Date(day);
      n.setHours(d.getHours(), d.getMinutes(), 0, 0);
      return n;
    };
    update.mutate(
      { shiftId: id, start_time: toApiDateTime(shift(it.start)), end_time: toApiDateTime(shift(it.end)) },
      { onSuccess: () => notify.success('Shift moved', `${it.e.title} → ${format(day, 'EEE d MMM')}`), onError: (e) => notify.error(e) },
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title={format(month, 'MMMM yyyy')}
        description="Drag a shift to another day to reschedule it. Colors show how full each shift is."
        actions={
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
              <ChevronLeft />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight />
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-4 text-[12.5px] text-muted">
        {[
          ['bg-success', 'Half full or more'],
          ['bg-warning', 'Under half full'],
          ['bg-danger', 'Full'],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', c)} /> {l}
          </span>
        ))}
      </div>
      {events.isLoading ? (
        <Skeleton className="h-[640px] rounded-xl" />
      ) : events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 overflow-hidden rounded-xl bg-line [box-shadow:inset_0_0_0_1px_var(--line)]" style={{ gap: 1 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="type-eyebrow-sm bg-surface-2 px-3 py-2.5">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const todays = items.filter((x) => isSameDay(x.start, day)).sort((a, b) => a.start.getTime() - b.start.getTime());
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(key);
                  }}
                  onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
                  onDrop={(e) => onDrop(day, e)}
                  className={cn('min-h-[124px] bg-surface p-2 transition-colors', !isSameMonth(day, month) && 'bg-sunken', dragOver === key && 'bg-accent-soft')}
                >
                  <div className={cn('type-data mb-1.5 grid size-6 place-items-center rounded-full text-[12px]', isToday ? 'bg-accent font-bold text-accent-fg' : isSameMonth(day, month) ? 'text-text' : 'text-faint')}>{format(day, 'd')}</div>
                  <div className="space-y-1">
                    {todays.slice(0, 4).map(({ s, e, start }) => (
                      <Link
                        key={s.id}
                        to={`/c/events/${e.id}`}
                        draggable
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData('text/shift', String(s.id));
                          ev.dataTransfer.effectAllowed = 'move';
                        }}
                        className={cn('group flex cursor-grab items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11.5px] font-medium active:cursor-grabbing', tone(s))}
                        title={`${e.title} · ${format(start, 'HH:mm')} · ${s.confirmed_count ?? 0}/${s.capacity}`}
                      >
                        <GripVertical className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                        <span className="type-data shrink-0">{format(start, 'HH:mm')}</span>
                        <span className="truncate">{e.title}</span>
                      </Link>
                    ))}
                    {todays.length > 4 && <div className="px-1.5 text-[11px] text-faint">+{todays.length - 4} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
