import type { ApiError } from '@/shared/api/http';

export type CheckInProblem = 'drift' | 'not-approved' | 'already' | 'window' | 'qr' | 'location' | 'rate' | 'other';

export interface CheckInGuidance {
  kind: CheckInProblem;
  title: string;
  fix: string;
  /** Raw server message, shown small for transparency. */
  detail: string;
}

/** Maps AttendanceController::checkIn failures to plain guidance (what happened + how to fix it). */
export function explainCheckInError(e: ApiError): CheckInGuidance {
  const m = e.message;
  if (e.status === 429) return { kind: 'rate', title: 'Too many attempts', fix: 'Wait a minute, then try once more. If it keeps failing, ask your coordinator for a manual check-in.', detail: m };
  if (/time-drift/i.test(m)) return { kind: 'drift', title: 'Your phone’s clock is off', fix: 'Turn on automatic date & time in your phone settings, then try again.', detail: m };
  if (/not scheduled or approved/i.test(m)) return { kind: 'not-approved', title: 'You’re not confirmed for this shift', fix: 'Only confirmed volunteers can check in. Check your schedule or speak to the coordinator.', detail: m };
  if (/already checked in/i.test(m)) return { kind: 'already', title: 'You’re already checked in', fix: 'Your attendance is recorded. Check out from the green bar when you finish.', detail: m };
  if (/check-in window/i.test(m)) return { kind: 'window', title: 'Check-in isn’t open right now', fix: 'Check-in opens 15 minutes before the shift and closes 30 minutes after it starts.', detail: m };
  if (/QR code/i.test(m)) return { kind: 'qr', title: 'That QR code isn’t current', fix: 'Codes rotate every 15 minutes. Ask your coordinator to show the code on screen now and scan it again.', detail: m };
  const meters = /You are ([\d.]+) meters away/i.exec(m);
  if (meters) {
    const limit = /limit: (\d+)/i.exec(m)?.[1];
    return {
      kind: 'location',
      title: `You’re ${Math.round(Number(meters[1]))} m from the venue`,
      fix: `Move inside the ${limit ?? ''} m check-in area and try again. Indoors, step near a window to improve GPS accuracy.`.replace('  ', ' '),
      detail: m,
    };
  }
  return { kind: 'other', title: 'Check-in didn’t go through', fix: 'Try again. If it keeps failing, ask your coordinator for a manual check-in.', detail: m };
}
