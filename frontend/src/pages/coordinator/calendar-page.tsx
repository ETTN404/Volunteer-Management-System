import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock4, GripVertical, MapPin, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { parseApiDate, toApiDateTime } from '@/shared/lib/time';
import { Button, ErrorState, PageHeader, Skeleton, notify } from '@/shared/ui';
import { useAllOrgEvents, useUpdateShift } from '@/features/operations/api';
import type { Shift, VmsEvent } from '@/shared/types/api';

type Item = { s: Shift; e: VmsEvent; start: Date; end: Date };

function dot(s: Shift) {
  const ratio = s.capacity ? (s.confirmed_count ?? 0) / s.capacity : 0;
  return ratio >= 1 ? 'bg-danger' : ratio < 0.5 ? 'bg-warning' : 'bg-success';
}

/** Phones: a compact month with dots, and the chosen day's shifts as cards. */
function MobileMonth({ month, days, items }: { month: Date; days: Date[]; items: Item[] }) {
  const [picked, setPicked] = useState<Date>(() => (isSameMonth(new Date(), month) ? new Date() : month));
  useEffect(() => {
    setPicked(isSameMonth(new Date(), month) ? new Date() : month);
  }, [month]);
  const dayItems = items.filter((x) => isSameDay(x.start, picked)).sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="md:hidden">
      <div className="rounded-[20px] bg-surface p-2.5 [box-shadow:inset_0_0_0_1px_var(--line)]">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-faint">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1.5">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const list = items.filter((x) => isSameDay(x.start, day));
            const on = isSameDay(day, picked);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                onClick={() => setPicked(day)}
                aria-pressed={on}
                aria-label={`${format(day, 'EEEE d MMMM')}, ${list.length} shifts`}
                className={cn(
                  'mx-auto flex h-12 w-full max-w-[46px] flex-col items-center justify-center gap-1 rounded-[12px] transition-colors',
                  on ? 'bg-text text-bg' : today ? 'bg-accent-soft text-accent-text' : 'hover:bg-surface-2',
                  !isSameMonth(day, month) && !on && 'opacity-40',
                )}
              >
                <span className="type-data text-[14px] font-semibold leading-none">{format(day, 'd')}</span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {list.slice(0, 3).map((x) => (
                    <span key={x.s.id} className={cn('size-1.5 rounded-full', on ? 'bg-bg' : dot(x.s))} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-2 mt-5 flex items-baseline justify-between px-1">
        <h2 className="text-[15px] font-bold text-text">{format(picked, 'EEEE, d MMMM')}</h2>
        <span className="text-[12.5px] text-muted">{dayItems.length ? `${dayItems.length} shift${dayItems.length === 1 ? '' : 's'}` : ''}</span>
      </div>
      {dayItems.length === 0 ? (
        <p className="rounded-[18px] bg-surface px-4 py-8 text-center text-[13.5px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">No shifts on this day.</p>
      ) : (
        <ul className="space-y-2.5">
          {dayItems.map(({ s, e, start, end }) => {
            const filled = s.confirmed_count ?? 0;
            return (
              <li key={s.id}>
                <Link to={`/c/events/${e.id}`} className={cn('block rounded-[18px] p-4 transition-transform active:scale-[0.99]', tone(s))}>
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    <Clock4 className="size-3.5" />
                    <span className="type-data">
                      {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[15px] font-bold text-text">{e.title}</div>
                  {s.title && <div className="text-[13px] text-muted">{s.title}</div>}
                  <div className="mt-3 flex items-center justify-between gap-3 text-[12.5px] text-muted">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{e.location}</span>
                    </span>
                    <span className="type-data inline-flex shrink-0 items-center gap-1 font-semibold text-text">
                      <Users className="size-3.5" />
                      {filled}/{s.capacity}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
        description={<><span className="hidden md:inline">Drag a shift to another day to reschedule it. </span>Colors show how full each shift is.</>}
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
        <>
        <MobileMonth month={month} days={days} items={items} />
        <div className="hidden overflow-x-auto md:block">
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
        </>
      )}
    </>
  );
}
