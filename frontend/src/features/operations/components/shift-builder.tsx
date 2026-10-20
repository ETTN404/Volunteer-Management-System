import { AnimatePresence, motion } from 'motion/react';
import { CalendarRange, Copy, Minus, Plus, Repeat, Trash2, Users } from 'lucide-react';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { cn } from '@/shared/lib/cn';
import { SKILL_CATALOGUE, normalizeSkill } from '@/shared/lib/skills';
import { Button, DatePicker, Field, Input, TagInput, TimePicker } from '@/shared/ui';
import { SHIFT_TEMPLATES, draftProblems, newDraftKey, type ShiftDraft } from '../event-schema';

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fmtLen = (a: string, b: string) => {
  const d = minutes(b) - minutes(a);
  return d > 0 ? `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}` : '—';
};

export function emptyDraft(date: string, tpl = SHIFT_TEMPLATES[0]!): ShiftDraft {
  return { key: newDraftKey(), title: tpl.title, notes: '', date, start: tpl.start, end: tpl.end, capacity: 10, required_skills: [] };
}

/**
 * Shift planner for the event wizard: templates, per-day timeline, duplicate and
 * "repeat every day". Everything is local until the event is published.
 */
export function ShiftBuilder({ value, onChange, startDate, endDate }: { value: ShiftDraft[]; onChange: (v: ShiftDraft[]) => void; startDate: string; endDate: string }) {
  const days = startDate && endDate && endDate >= startDate ? eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((d) => format(d, 'yyyy-MM-dd')) : [];
  const set = (key: string, patch: Partial<ShiftDraft>) => onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const totalPlaces = value.reduce((n, d) => n + (d.capacity || 0), 0);

  const repeatEveryDay = (d: ShiftDraft) => {
    const existing = new Set(value.filter((x) => x.start === d.start && x.end === d.end && x.title === d.title).map((x) => x.date));
    const copies = days.filter((day) => !existing.has(day)).map((day) => ({ ...d, key: newDraftKey(), date: day }));
    onChange([...value, ...copies].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Day timeline */}
      {days.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-surface-2 p-3">
          <div className="flex min-w-max gap-2">
            {days.map((day) => {
              const list = value.filter((d) => d.date === day);
              return (
                <div key={day} className="w-36 shrink-0 rounded-md bg-surface p-2 [box-shadow:inset_0_0_0_1px_var(--line)]">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[12px] font-semibold text-text">{format(parseISO(day), 'EEE d MMM')}</span>
                    <span className="text-[11px] text-faint">{list.reduce((n, d) => n + d.capacity, 0)} places</span>
                  </div>
                  <div className="relative h-24 rounded-sm bg-sunken">
                    {list.map((d) => {
                      const top = (Math.max(0, minutes(d.start) - 360) / (18 * 60)) * 100;
                      const h = (Math.max(15, minutes(d.end) - minutes(d.start)) / (18 * 60)) * 100;
                      return (
                        <div
                          key={d.key}
                          title={`${d.title || 'Shift'} ${d.start}–${d.end}`}
                          className="absolute inset-x-1 rounded-[3px] bg-accent/80"
                          style={{ top: `${Math.min(top, 96)}%`, height: `${Math.max(4, Math.min(h, 100 - top))}%` }}
                        />
                      );
                    })}
                    {list.length === 0 && <span className="absolute inset-0 grid place-items-center text-[10.5px] text-faint">No shifts</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange([...value, emptyDraft(day)])}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm py-1 text-[11.5px] font-medium text-accent-text hover:bg-accent-soft"
                  >
                    <Plus className="size-3" /> Add
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-faint">Timeline shows 06:00–24:00.</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {value.map((d, i) => {
          const problem = draftProblems(d, startDate, endDate);
          return (
            <motion.div
              key={d.key}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={cn('rounded-lg bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)]', problem && '[box-shadow:inset_0_0_0_1px_var(--danger)]')}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text">{i + 1}</span>
                <Input value={d.title} onChange={(e) => set(d.key, { title: e.target.value })} placeholder="Shift name, e.g. Registration desk" inputSize="sm" className="min-w-0 flex-1 font-medium" aria-label="Shift name" />
                <div className="ml-auto flex items-center gap-1">
                  {days.length > 1 && (
                    <Button type="button" size="xs" variant="ghost" onClick={() => repeatEveryDay(d)} title="Copy to every day of the event">
                      <Repeat /> Every day
                    </Button>
                  )}
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Duplicate shift" onClick={() => onChange([...value.slice(0, i + 1), { ...d, key: newDraftKey() }, ...value.slice(i + 1)])}>
                    <Copy />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove shift" onClick={() => onChange(value.filter((x) => x.key !== d.key))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
                <Field label="Day">
                  <DatePicker value={d.date} onChange={(v) => set(d.key, { date: v })} min={startDate} max={endDate} />
                </Field>
                <Field label="Starts">
                  <TimePicker value={d.start} onChange={(v) => set(d.key, { start: v })} />
                </Field>
                <Field label={`Ends · ${fmtLen(d.start, d.end)}`}>
                  <TimePicker value={d.end} onChange={(v) => set(d.key, { end: v })} min={d.start} />
                </Field>
                <Field label="Volunteers">
                  <div className="flex h-10 items-center rounded-md bg-sunken [box-shadow:inset_0_0_0_1px_var(--line)]">
                    <button type="button" aria-label="Fewer" className="grid h-full w-9 place-items-center text-muted hover:text-text" onClick={() => set(d.key, { capacity: Math.max(1, d.capacity - 1) })}>
                      <Minus className="size-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={d.capacity}
                      onChange={(e) => set(d.key, { capacity: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                      className="type-data h-full w-12 bg-transparent text-center text-sm outline-none"
                      aria-label="Volunteers needed"
                    />
                    <button type="button" aria-label="More" className="grid h-full w-9 place-items-center text-muted hover:text-text" onClick={() => set(d.key, { capacity: d.capacity + 1 })}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Skills needed" optional hint="Volunteers with these skills are ranked first.">
                  <TagInput value={d.required_skills} onChange={(v) => set(d.key, { required_skills: v })} suggestions={SKILL_CATALOGUE} normalize={normalizeSkill} max={8} />
                </Field>
                <Field label="What volunteers will do" optional>
                  <Input value={d.notes} onChange={(e) => set(d.key, { notes: e.target.value })} placeholder="e.g. Greet donors and fill in forms" />
                </Field>
              </div>
              {problem && <p className="mt-2 text-[12.5px] text-danger-text">{problem}</p>}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Add a shift:</span>
        {SHIFT_TEMPLATES.map((t) => (
          <Button key={t.label} type="button" size="sm" variant="secondary" onClick={() => onChange([...value, emptyDraft(value.at(-1)?.date ?? startDate, t)])}>
            <Plus /> {t.label} <span className="text-faint">{t.start}–{t.end}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="size-4" /> {value.length} {value.length === 1 ? 'shift' : 'shifts'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" /> {totalPlaces} volunteer places
        </span>
      </div>
    </div>
  );
}
