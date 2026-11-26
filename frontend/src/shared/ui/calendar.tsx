/**
 * shadcn-style date & time pickers built on react-day-picker 9.
 * Values are plain strings so they drop straight into forms and API payloads:
 *   DatePicker   → 'yyyy-MM-dd'
 *   TimePicker   → 'HH:mm' (24h, any minute)
 *   DateRangePicker → { from, to } 'yyyy-MM-dd'
 */
import { format, isValid, parse } from 'date-fns';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { cn } from '@/shared/lib/cn';
import { useFieldControl } from './field';
import { Popover, PopoverContent, PopoverTrigger } from './overlay';

const trigger =
  'flex h-10 w-full items-center gap-2 rounded-md bg-sunken px-3 text-left text-sm text-text shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow,background-color] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-soft)] data-[placeholder=true]:text-faint';

export function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'type-title text-sm',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30 [&_svg]:size-4',
        button_next: 'grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30 [&_svg]:size-4',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-[11px] font-medium uppercase tracking-wide text-faint',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'size-9 rounded-md font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus aria-selected:hover:bg-accent',
        selected: '[&>button]:bg-accent [&>button]:text-accent-fg [&>button]:hover:bg-accent',
        today: '[&>button]:shadow-[inset_0_0_0_1px_var(--accent)]',
        outside: '[&>button]:text-faint/60',
        disabled: '[&>button]:pointer-events-none [&>button]:text-faint/40 [&>button]:line-through',
        range_start: '[&>button]:rounded-r-none',
        range_end: '[&>button]:rounded-l-none',
        range_middle: '[&>button]:rounded-none [&>button]:bg-accent-soft [&>button]:text-accent-text',
        hidden: 'invisible',
        // Month / year dropdowns (captionLayout="dropdown"): a styled label with a
        // transparent native <select> on top — big, scrollable, works on phones.
        dropdowns: 'relative z-10 flex items-center gap-1.5',
        dropdown_root:
          'relative inline-flex h-8 items-center rounded-md bg-surface-2 px-2.5 text-sm font-medium text-text shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] has-focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--accent-soft)]',
        dropdown: 'absolute inset-0 w-full cursor-pointer opacity-0',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft /> : orientation === 'down' ? <ChevronDown className="ml-1 size-3.5 text-faint" /> : <ChevronRight />,
      }}
      {...props}
    />
  );
}

const toDate = (v?: string | null) => {
  if (!v) return undefined;
  const d = parse(v, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
};
const toStr = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : '');

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  className?: string;
  'aria-describedby'?: string;
  /**
   * Show month + year dropdowns so far-away dates (e.g. a birthday) are one pick
   * away instead of dozens of arrow clicks. `true` = the last 100 years.
   */
  yearPicker?: boolean | { from: number; to?: number };
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', min, max, disabled, id, invalid, className, yearPicker, ...aria }: DatePickerProps) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const minD = toDate(min);
  const maxD = toDate(max);
  const thisYear = new Date().getFullYear();
  const years = yearPicker ? (yearPicker === true ? { from: thisYear - 100, to: maxD?.getFullYear() ?? thisYear + 5 } : yearPicker) : null;
  const dropdownProps = years
    ? {
        captionLayout: 'dropdown' as const,
        startMonth: minD ?? new Date(years.from, 0),
        endMonth: maxD ?? new Date(years.to ?? thisYear + 5, 11),
      }
    : {};
  // Birthdays: open around a typical adult age instead of today.
  const fallbackMonth = years && !minD ? new Date(Math.min(thisYear - 20, maxD?.getFullYear() ?? thisYear), 0) : minD;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={aria['aria-describedby']}
          data-placeholder={!selected}
          className={cn(trigger, className)}
        >
          <CalendarDays className="size-4 shrink-0 text-faint" />
          <span className="truncate">{selected ? format(selected, 'EEE, d MMM yyyy') : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? fallbackMonth}
          onSelect={(d) => {
            if (d) onChange(toStr(d));
            setOpen(false);
          }}
          disabled={[...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])]}
          autoFocus
          {...dropdownProps}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangeValue {
  from: string;
  to: string;
}

export function DateRangePicker({
  value,
  onChange,
  min,
  placeholder = 'Pick dates',
  invalid,
  id,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  min?: string;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
}) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const range: DateRange | undefined = value.from ? { from: toDate(value.from), to: toDate(value.to) } : undefined;
  const minD = toDate(min);
  const label =
    range?.from && range.to
      ? range.from.getTime() === range.to.getTime()
        ? format(range.from, 'EEE, d MMM yyyy')
        : `${format(range.from, 'd MMM')} – ${format(range.to, 'd MMM yyyy')}`
      : range?.from
        ? `${format(range.from, 'd MMM yyyy')} – …`
        : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-invalid={invalid || undefined} data-placeholder={!range?.from} className={trigger}>
          <CalendarDays className="size-4 shrink-0 text-faint" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={typeof window !== 'undefined' && window.innerWidth > 640 ? 2 : 1}
          selected={range}
          defaultMonth={range?.from ?? minD}
          onSelect={(r) => {
            onChange({ from: toStr(r?.from), to: toStr(r?.to ?? r?.from) });
            if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setOpen(false);
          }}
          disabled={minD ? { before: minD } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const QUICK = ['06:00', '08:00', '09:00', '12:00', '13:00', '14:00', '17:00', '18:00'];

function timeLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return format(d, 'h:mm a');
}

/**
 * Hour · minute · AM/PM columns: any minute of the day, easy to tap on phones.
 * The value is 'HH:mm' (24h). Quick picks cover the usual round times.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = 'Time',
  id,
  invalid,
  min,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  /** @deprecated every minute can be picked now; kept for old call sites. */
  step?: number;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  /** Times before this 'HH:mm' are dimmed (still pickable; the form validates). */
  min?: string;
}) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const current = value && /^\d{1,2}:\d{2}$/.test(value) ? value : '09:00';
  const [h24 = 9, m = 0] = current.split(':').map(Number);
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const to24 = (hour12: number, minute: number, isPm: boolean) => `${pad((hour12 % 12) + (isPm ? 12 : 0))}:${pad(minute)}`;
  const set = (hour12: number, minute: number, isPm: boolean) => onChange(to24(hour12, minute, isPm));
  const before = (t: string) => Boolean(min && t < min);
  const center = (el: HTMLElement | null) => el?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
  const cell = (selected: boolean, dim = false) =>
    cn(
      'flex h-8 w-full shrink-0 items-center justify-center rounded-sm text-sm tabular-nums transition-colors hover:bg-surface-2',
      dim && 'text-faint/60',
      selected && 'bg-accent font-semibold text-accent-fg hover:bg-accent',
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-invalid={invalid || undefined} data-placeholder={!value} className={trigger}>
          <Clock className="size-4 shrink-0 text-faint" />
          <span className="truncate">{value ? timeLabel(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[252px] p-2">
        <div className="mb-1.5 grid grid-cols-[1fr_1fr_60px] gap-1.5 px-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-faint">
          <span className="text-center">Hour</span>
          <span className="text-center">Minute</span>
          <span />
        </div>
        <div className="grid grid-cols-[1fr_1fr_60px] gap-1.5">
          <div role="listbox" aria-label="Hour" className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5" ref={center}>
            {HOURS.map((h) => (
              <button key={h} type="button" role="option" aria-selected={h === h12} className={cell(h === h12, before(to24(h, m, pm)))} onClick={() => set(h, m, pm)}>
                {h}
              </button>
            ))}
          </div>
          <div role="listbox" aria-label="Minute" className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5" ref={center}>
            {MINUTES.map((mm) => (
              <button key={mm} type="button" role="option" aria-selected={mm === m} className={cell(mm === m, before(to24(h12, mm, pm)))} onClick={() => set(h12, mm, pm)}>
                {pad(mm)}
              </button>
            ))}
          </div>
          <div role="listbox" aria-label="AM or PM" className="space-y-0.5">
            {(['AM', 'PM'] as const).map((p) => (
              <button key={p} type="button" role="option" aria-selected={(p === 'PM') === pm} className={cell((p === 'PM') === pm)} onClick={() => set(h12, m, p === 'PM')}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                onChange(q);
                setOpen(false);
              }}
              className={cn('rounded-full bg-surface-2 px-2 py-1 text-[11.5px] font-medium text-muted hover:text-text', q === value && 'bg-accent-soft text-accent-text')}
            >
              {timeLabel(q)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!value) onChange(current);
            setOpen(false);
          }}
          className="mt-2 h-9 w-full rounded-md bg-accent text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          Done · {timeLabel(current)}
        </button>
      </PopoverContent>
    </Popover>
  );
}
