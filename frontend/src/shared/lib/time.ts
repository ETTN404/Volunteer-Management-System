import { t as tr } from '@/shared/i18n';
import {
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns';

const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

/**
 * Laravel (APP timezone UTC) returns either ISO strings with `Z` (datetime casts) or
 * naive "Y-m-d H:i:s" strings (toDateTimeString) that are also UTC. Date-only "Y-m-d"
 * values are calendar dates and parse as local midnight.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = NAIVE_DATETIME.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const d = parseISO(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date as the Laravel `Y-m-d H:i:s` wire format in UTC (CreateShiftRequest). */
export function toApiDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDay(value: string | Date | null | undefined): string {
  const d = typeof value === 'string' ? parseApiDate(value) : value;
  if (!d) return '—';
  if (isToday(d)) return tr('Today');
  if (isTomorrow(d)) return tr('Tomorrow');
  return format(d, 'EEE, d MMM');
}

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy'): string {
  const d = typeof value === 'string' ? parseApiDate(value) : value;
  return d ? format(d, pattern) : '—';
}

export function formatTime(value: string | Date | null | undefined): string {
  const d = typeof value === 'string' ? parseApiDate(value) : value;
  return d ? format(d, 'HH:mm') : '—';
}

export function formatTimeRange(start: string, end: string): string {
  const s = parseApiDate(start);
  const e = parseApiDate(end);
  if (!s || !e) return '—';
  return isSameDay(s, e)
    ? `${format(s, 'HH:mm')} – ${format(e, 'HH:mm')}`
    : `${format(s, 'd MMM HH:mm')} – ${format(e, 'd MMM HH:mm')}`;
}

export function formatRelative(value: string | Date | null | undefined): string {
  const d = typeof value === 'string' ? parseApiDate(value) : value;
  if (!d) return '—';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function durationHours(start: string, end: string): number {
  const s = parseApiDate(start);
  const e = parseApiDate(end);
  if (!s || !e) return 0;
  return Math.max(0, differenceInMinutes(e, s) / 60);
}

/** Backend check-in window: 15 min before start until 30 min after start. */
export const CHECK_IN_WINDOW = { beforeMin: 15, afterMin: 30 } as const;

export type CheckInWindowState =
  | { state: 'early'; opensAt: Date }
  | { state: 'open'; closesAt: Date }
  | { state: 'closed'; closedAt: Date };

export function checkInWindow(shiftStart: string, now: Date = new Date()): CheckInWindowState | null {
  const start = parseApiDate(shiftStart);
  if (!start) return null;
  const opensAt = new Date(start.getTime() - CHECK_IN_WINDOW.beforeMin * 60_000);
  const closesAt = new Date(start.getTime() + CHECK_IN_WINDOW.afterMin * 60_000);
  if (now < opensAt) return { state: 'early', opensAt };
  if (now > closesAt) return { state: 'closed', closedAt: closesAt };
  return { state: 'open', closesAt };
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function countdownTo(target: Date, now: Date = new Date()): Countdown {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
  };
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
