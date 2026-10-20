import type { ApiError } from '@/shared/api/http';

export type CheckInProblem =
  | 'drift'
  | 'not-approved'
  | 'already'
  | 'checked-out'
  | 'window'
  | 'qr'
  | 'location'
  | 'gps'
  | 'org'
  | 'busy'
  | 'rate'
  | 'other';

export interface CheckInGuidance {
  kind: CheckInProblem;
  title: string;
  fix: string;
  /** Raw server message, shown small for transparency. */
  detail: string;
}

/** Maps AttendanceService::checkIn failures (by `code`) to plain guidance: what happened + how to fix it. */
export function explainCheckInError(e: ApiError): CheckInGuidance {
  const m = e.message;
  const g = (kind: CheckInProblem, title: string, fix: string): CheckInGuidance => ({ kind, title, fix, detail: m });

  if (e.status === 429) return g('rate', 'Too many attempts', 'Wait a minute, then try once more. If it keeps failing, ask your coordinator to check you in.');
  switch (e.code) {
    case 'clock_drift':
      return g('drift', 'Your phone’s clock is off', 'Turn on automatic date & time in your phone settings, then try again.');
    case 'not_confirmed':
      return g('not-approved', 'You’re not confirmed for this shift', 'Only confirmed volunteers can check in. Check your schedule or speak to the coordinator.');
    case 'already_checked_in':
      return g('already', 'You’re already checked in', 'Your attendance is recorded. Check out when you finish.');
    case 'already_checked_out':
      return g('checked-out', 'You already checked out', m);
    case 'outside_window':
      return g('window', 'Check-in isn’t open right now', 'Check-in opens 15 minutes before the shift and closes 30 minutes after it starts. Late? The coordinator can check you in.');
    case 'qr_invalid':
      return g('qr', 'That QR code isn’t current', 'The code on the coordinator’s screen changes every 30 seconds. Scan it again directly from their screen — photos sent by others will not work.');
    case 'gps_inaccurate':
      return g('gps', 'Your GPS signal is too weak', 'Step outside or away from tall buildings for a few seconds until the accuracy improves, then try again.');
    case 'outside_geofence': {
      const meters = Number((e.body.distance_m as number | undefined) ?? /You are ([\d.]+) meters/i.exec(m)?.[1] ?? 0);
      return g('location', `You’re ${Math.round(meters)} m from the venue`, 'Move inside the check-in area shown on the map and try again.');
    }
    case 'organization_inactive':
    case 'event_cancelled':
      return g('org', 'This event can’t take check-ins', m);
    case 'busy':
      return g('busy', 'Another device is checking you in', 'Wait a moment — your other phone or tab is already doing this.');
  }
  return g('other', 'Check-in didn’t go through', 'Try again. If it keeps failing, ask your coordinator to check you in.');
}
