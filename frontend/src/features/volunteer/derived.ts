import { useMemo } from 'react';
import type { Attendance, Shift, ShiftAssignment, VmsEvent } from '@/shared/types/api';
import { parseApiDate } from '@/shared/lib/time';
import { useAttendanceHistory, useSchedule } from './api';

export interface ScheduledShift {
  assignment: ShiftAssignment;
  shift: Shift;
  event: VmsEvent;
  start: Date;
  end: Date;
  attendance?: Attendance;
}

/** Schedule joined with attendance — the volunteer's single source for "what's next / what's live". */
export function useMyShifts() {
  const schedule = useSchedule();
  const attendance = useAttendanceHistory();

  const data = useMemo(() => {
    const rows: ScheduledShift[] = (schedule.data ?? [])
      .filter((a) => a.shift?.event)
      .map((a) => ({
        assignment: a,
        shift: a.shift!,
        event: a.shift!.event!,
        start: parseApiDate(a.shift!.start_time)!,
        end: parseApiDate(a.shift!.end_time)!,
        attendance: (attendance.data ?? []).find((x) => x.shift_id === a.shift_id),
      }));
    const now = new Date();
    const upcoming = rows.filter((r) => r.assignment.status !== 'cancelled' && r.end > now).sort((a, b) => a.start.getTime() - b.start.getTime());
    const nextConfirmed = upcoming.find((r) => r.assignment.status === 'confirmed' && !r.attendance?.check_out_time);
    const active = rows.find((r) => r.attendance && !r.attendance.check_out_time);
    const past = rows.filter((r) => r.end <= now || r.attendance?.check_out_time).sort((a, b) => b.start.getTime() - a.start.getTime());
    return { rows, upcoming, nextConfirmed, active, past, pending: rows.filter((r) => r.assignment.status === 'pending' && r.end > now) };
  }, [schedule.data, attendance.data]);

  return { ...data, isLoading: schedule.isLoading, error: schedule.error, refetch: schedule.refetch };
}
