/**
 * shadcn-style date & time pickers built on react-day-picker 9.
 * Values are plain strings so they drop straight into forms and API payloads:
 *   DatePicker   → 'yyyy-MM-dd'
 *   TimePicker   → 'HH:mm' (24h)
 *   DateRangePicker → { from, to } 'yyyy-MM-dd'
 */
import { format, isValid, parse } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useMemo, useState, type ComponentProps } from 'react';
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
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => (orientation === 'left' ? <ChevronLeft /> : <ChevronRight />),
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
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', min, max, disabled, id, invalid, className, ...aria }: DatePickerProps) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const minD = toDate(min);
  const maxD = toDate(max);
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
          defaultMonth={selected ?? minD}
          onSelect={(d) => {
            if (d) onChange(toStr(d));
            setOpen(false);
          }}
          disabled={[...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])]}
          autoFocus
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

/** 15-minute time slots in a scrollable list — no fiddly native time inputs on phones. */
export function TimePicker({
  value,
  onChange,
  step = 15,
  placeholder = 'Time',
  id,
  invalid,
  min,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  /** Slots before this 'HH:mm' are disabled. */
  min?: string;
}) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 24 * 60; m += step) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    return out;
  }, [step]);
  const label = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return format(d, 'h:mm a');
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} aria-invalid={invalid || undefined} data-placeholder={!value} className={trigger}>
          <Clock className="size-4 shrink-0 text-faint" />
          <span className="truncate">{value ? label(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <div
          role="listbox"
          aria-label="Choose a time"
          className="max-h-64 overflow-y-auto overscroll-contain"
          ref={(el) => el?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })}
        >
          {slots.map((t) => {
            const disabled = Boolean(min && t < min);
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={t === value}
                disabled={disabled}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm tabular-nums hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-35',
                  t === value && 'bg-accent text-accent-fg hover:bg-accent',
                )}
              >
                {label(t)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
