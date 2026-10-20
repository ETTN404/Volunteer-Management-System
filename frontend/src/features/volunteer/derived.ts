import { useMemo } from 'react';
import type { Attendance, Shift, ShiftAssignment, VmsEvent } from '@/shared/types/api';
import { parseApiDate } from '@/shared/lib/time';
import { useSchedule } from './api';

export interface ScheduledShift {
  assignment: ShiftAssignment;
  shift: Shift;
  event: VmsEvent;
  start: Date;
  end: Date;
  attendance?: Attendance;
}

const CLOSED = new Set(['rejected', 'cancelled', 'removed']);

/**
 * The volunteer's schedule — each row carries its own attendance from the server, so
 * "Check in", "Check out", "Resume" and "Done" are always right, on every device.
 */
export function useMyShifts() {
  const schedule = useSchedule();

  const data = useMemo(() => {
    const rows: ScheduledShift[] = (schedule.data ?? [])
      .filter((a) => a.shift?.event)
      .map((a) => ({
        assignment: a,
        shift: a.shift!,
        event: a.shift!.event!,
        start: parseApiDate(a.shift!.start_time)!,
        end: parseApiDate(a.shift!.end_time)!,
        attendance: a.attendance ?? undefined,
      }));
    const now = new Date();
    const upcoming = rows.filter((r) => !CLOSED.has(r.assignment.status) && r.end > now && !r.attendance?.check_out_time).sort((a, b) => a.start.getTime() - b.start.getTime());
    const nextConfirmed = upcoming.find((r) => r.assignment.status === 'confirmed');
    const active = rows.find((r) => r.attendance && !r.attendance.check_out_time);
    const past = rows.filter((r) => r.end <= now || r.attendance?.check_out_time).sort((a, b) => b.start.getTime() - a.start.getTime());
    return { rows, upcoming, nextConfirmed, active, past, pending: rows.filter((r) => r.assignment.status === 'pending' && r.end > now) };
  }, [schedule.data]);

  return { ...data, isLoading: schedule.isLoading, error: schedule.error, refetch: schedule.refetch };
}

export type ShiftPhase = 'not-confirmed' | 'too-early' | 'check-in-open' | 'on-shift' | 'checked-out' | 'missed' | 'over';

/** Where a confirmed shift is in its lifecycle for this volunteer (drives every check-in button). */
export function shiftPhase(row: Pick<ScheduledShift, 'assignment' | 'start' | 'end' | 'attendance'>, now = new Date(), before = 15, after = 30): ShiftPhase {
  if (row.assignment.status !== 'confirmed') return 'not-confirmed';
  if (row.attendance && !row.attendance.check_out_time) return 'on-shift';
  if (row.attendance?.check_out_time) return 'checked-out';
  const open = new Date(row.start.getTime() - before * 60_000);
  const close = new Date(Math.min(row.start.getTime() + after * 60_000, row.end.getTime()));
  if (now < open) return 'too-early';
  if (now <= close) return 'check-in-open';
  return now < row.end ? 'missed' : 'over';
}
