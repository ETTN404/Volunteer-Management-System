import { http, HttpResponse } from 'msw';
import { checkGeofence } from '@/shared/lib/geo';
import { db, find, nextId, nowIso, paginate, res, dateTimeString } from '../../db';
import { authed, body, fail, json, ok, ORIGIN, param, validate, api } from '../utils';
import type { AttendanceRow } from '../../db/schema';
import { CERTIFICATE_MILESTONES } from '@/shared/lib/skills';

const reliability = (volunteerId: number) => {
  const totalConfirmed = db.t.assignments.filter((a) => a.volunteer_id === volunteerId && a.status === 'confirmed').length;
  if (totalConfirmed === 0) return { attendance_rate: 100, on_time_rate: 100, total_confirmed_shifts: 0 };
  const attended = db.t.attendances.filter((a) => a.volunteer_id === volunteerId);
  const onTime = attended.filter((a) => {
    const s = find.shift(a.shift_id);
    return s && a.check_in_time <= s.start_time;
  }).length;
  return {
    attendance_rate: Math.min(100, Math.round((attended.length / totalConfirmed) * 10_000) / 100),
    on_time_rate: attended.length ? Math.round((onTime / attended.length) * 10_000) / 100 : 100,
    total_confirmed_shifts: totalConfirmed,
    total_attended_shifts: attended.length,
  };
};

/** Mirror of Volunteer::getSkillsAlignment(). */
const skillsAlignment = (skills: string[]) => {
  const s = skills.map((x) => x.toLowerCase());
  const d: Record<string, number> = { Medical: 20, Logistics: 20, Crisis_Management: 20, Heavy_Lifting: 20, Leadership: 20 };
  if (s.includes('first_aid') || s.includes('medical') || s.includes('nurse')) {
    d.Medical! += 75;
    d.Crisis_Management! += 60;
  }
  if (s.includes('disaster_response') || s.includes('crisis')) {
    d.Crisis_Management! += 70;
    d.Logistics! += 45;
    d.Leadership! += 35;
  }
  if (s.includes('teaching') || s.includes('storytelling')) d.Leadership! += 60;
  if (s.includes('translation')) {
    d.Logistics! += 40;
    d.Leadership! += 20;
  }
  for (const k of Object.keys(d)) d[k] = Math.min(100, d[k]!);
  return d;
};

export const profilePayload = (volunteerId: number) => {
  const v = find.volunteer(volunteerId)!;
  return { volunteer: res.volunteer(v, { user: true }), reliability: reliability(v.id), skills_alignment: skillsAlignment(v.skills) };
};

const orgEvents = (orgId: number | null) => db.t.events.filter((e) => e.org_id === orgId);

export const volunteerHandlers = [
  http.get(
    api('/volunteer/profile'),
    authed(['Volunteer'], ({ actor }) => ok(profilePayload(actor.volunteer!.id))),
  ),

  http.patch(
    api('/volunteer/profile'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        full_name: { sometimes: true, type: 'string', max: 100 },
        bio: { sometimes: true, type: 'string', max: 1000, nullable: true },
        skills: { sometimes: true, type: 'array' },
        availability: { sometimes: true, type: 'array' },
      });
      if (invalid) return invalid;
      if (typeof b.full_name === 'string') actor.user.full_name = b.full_name;
      const v = actor.volunteer!;
      if (Array.isArray(b.skills)) v.skills = b.skills as string[];
      if (Array.isArray(b.availability)) v.availability = b.availability as string[];
      if ('bio' in b) v.bio = (b.bio as string) ?? null;
      if ('date_of_birth' in b) v.date_of_birth = (b.date_of_birth as string) ?? null; // PENDING-BE G5
      return ok(res.volunteer(v, { user: true }), 'Volunteer profile updated successfully.');
    }),
  ),

  http.get(
    api('/volunteer/impact'),
    authed(['Volunteer'], ({ actor }) => {
      const v = actor.volunteer!;
      const next = CERTIFICATE_MILESTONES.find((m) => m > v.total_hours) ?? null;
      return ok({
        total_hours: v.total_hours,
        impact_score: v.impact_score,
        completed_shifts_count: db.t.attendances.filter((a) => a.volunteer_id === v.id && a.check_out_time).length,
        next_milestone: next,
        hours_to_next: next ? Math.round((next - v.total_hours) * 100) / 100 : 0,
        earned_certificates: db.t.certificates.filter((c) => c.volunteer_id === v.id).length,
      });
    }),
  ),

  http.get(
    api('/volunteer/events'),
    authed(['Volunteer'], ({ actor, url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      // Event uses BelongsToTenant → scoped to the volunteer's organization.
      const events = orgEvents(actor.user.org_id).sort((a, b) => a.start_date.localeCompare(b.start_date));
      const { items, pagination } = paginate(events, page, 10);
      return ok(
        items.map((e) => res.event(e, { shifts: true, matchFor: actor.volunteer!.skills })),
        undefined,
        200,
        { pagination },
      );
    }),
  ),

  http.post(
    api('/volunteer/apply/:shiftId'),
    authed(['Volunteer'], ({ actor, params }) => {
      const shiftId = Number(params.shiftId);
      const shift = find.shift(shiftId);
      if (!shift) return fail('Target database resource not found.', 404);
      const v = actor.volunteer!;
      if (db.t.assignments.some((a) => a.shift_id === shiftId && a.volunteer_id === v.id && a.status !== 'cancelled')) {
        return fail('You have already applied for this shift.');
      }
      const overlap = db.t.assignments.find((a) => {
        if (a.volunteer_id !== v.id || a.shift_id === shiftId || !['pending', 'confirmed'].includes(a.status)) return false;
        const s = find.shift(a.shift_id);
        return s && s.start_time < shift.end_time && s.end_time > shift.start_time;
      });
      if (overlap) {
        return fail('Scheduling Conflict: This shift overlaps with another shift you are already scheduled for or have applied to.', 422, {
          conflict_shift_id: overlap.shift_id,
        });
      }
      // Full shift → waitlist (mirrors VolunteerController::applyForShift).
      const full = db.t.assignments.filter((a) => a.shift_id === shiftId && a.status === 'confirmed').length >= shift.capacity;
      const row = {
        id: nextId(db.t.assignments),
        shift_id: shiftId,
        volunteer_id: v.id,
        status: full ? ('waitlisted' as const) : ('pending' as const),
        waitlisted_at: full ? nowIso() : null,
        assigned_at: null,
        decline_reason: null,
        created_at: nowIso(),
      };
      db.t.assignments.push(row);
      const out = res.assignment(row);
      return ok(
        out,
        full
          ? `This shift is full, so you're on the waitlist (#${out.waitlist_position}). If a place opens up you get it automatically and we'll tell you.`
          : 'Application submitted successfully. Under coordinator review.',
        201,
      );
    }),
  ),

  http.delete(
    api('/volunteer/apply/:assignmentId'),
    authed(['Volunteer'], (ctx) => {
      const id = param(ctx, 'assignmentId');
      const idx = db.t.assignments.findIndex((a) => a.id === id && a.volunteer_id === ctx.actor.volunteer!.id && ['pending', 'confirmed', 'waitlisted'].includes(a.status));
      if (idx < 0) return fail('Target database resource not found.', 404);
      const row = db.t.assignments[idx]!;
      if (row.status === 'confirmed') {
        row.status = 'cancelled';
        // A freed place goes to the first person on the waitlist.
        const next = db.t.assignments
          .filter((a) => a.shift_id === row.shift_id && a.status === 'waitlisted')
          .sort((a, b) => (a.waitlisted_at ?? '').localeCompare(b.waitlisted_at ?? '') || a.id - b.id)[0];
        if (next) {
          next.status = 'confirmed';
          next.assigned_at = nowIso();
        }
      } else {
        db.t.assignments.splice(idx, 1);
      }
      return json({ status: 'success', message: 'Shift application withdrawn successfully.' });
    }),
  ),

  http.get(
    api('/volunteer/schedule'),
    authed(['Volunteer'], ({ actor }) => {
      const rows = db.t.assignments
        .filter((a) => a.volunteer_id === actor.volunteer!.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((a) => {
          const att = db.t.attendances.filter((x) => x.shift_id === a.shift_id && x.volunteer_id === a.volunteer_id).at(-1);
          return { ...res.assignment(a, { shift: true, shiftEvent: true }), attendance: att ? res.attendance(att) : null };
        });
      return ok(rows);
    }),
  ),

  http.post(
    api('/volunteer/check-in'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        shift_id: { required: true, custom: (v) => (find.shift(Number(v)) ? null : 'The selected shift id is invalid.') },
        qr_code_signature: { required: true, type: 'string' },
        accuracy: { type: 'number', min: 0 },
        latitude: { required: true, type: 'number', min: -90, max: 90 },
        longitude: { required: true, type: 'number', min: -180, max: 180 },
        client_timestamp: { required: true, type: 'date' },
      });
      if (invalid) return invalid;

      const clientTime = new Date(String(b.client_timestamp));
      if (Math.abs(Date.now() - clientTime.getTime()) / 60_000 > 2) {
        return fail('Security Error: High time-drift detected. Ensure your device clock is synced accurately to the network.', 422, { code: 'clock_drift' });
      }
      const shift = find.shift(Number(b.shift_id))!;
      const v = actor.volunteer!;
      const assignment = db.t.assignments.find((a) => a.shift_id === shift.id && a.volunteer_id === v.id && a.status === 'confirmed');
      if (!assignment) return fail('Security Gate: You are not scheduled or approved for this shift.', 403, { code: 'not_confirmed' });
      const existing = db.t.attendances.find((a) => a.shift_id === shift.id && a.volunteer_id === v.id);
      if (existing && !existing.check_out_time) return fail('You are already checked in to this shift.', 409, { code: 'already_checked_in', attendance: res.attendance(existing) });
      if (existing) return fail('You already checked out of this shift. Use "Resume shift" within 10 minutes, or ask the coordinator to check you back in.', 409, { code: 'already_checked_out' });
      const start = new Date(shift.start_time).getTime();
      const opens = start - 15 * 60_000;
      const closes = start + 30 * 60_000;
      if (Date.now() < opens || Date.now() > closes) {
        const t = (ms: number) => dateTimeString(new Date(ms).toISOString()).slice(11);
        return fail(`Check-in is unavailable. Check-in window is open between ${t(opens)} and ${t(closes)}.`, 422, { code: 'outside_window' });
      }
      if (shift.qr_code_signature !== b.qr_code_signature || (shift.qr_expires_at && new Date(shift.qr_expires_at) < new Date())) {
        return fail('Validation Failed: Scanned QR code signature is invalid or has expired.', 422, { code: 'qr_invalid' });
      }
      const event = find.event(shift.event_id)!;
      if (event.latitude != null && event.longitude != null) {
        const g = checkGeofence(
          { latitude: Number(b.latitude), longitude: Number(b.longitude) },
          { latitude: event.latitude, longitude: event.longitude },
          event.geofence_radius,
        );
        if (b.accuracy != null && Number(b.accuracy) > Math.max(150, event.geofence_radius)) {
          return fail(`Your GPS signal is too weak (±${Math.round(Number(b.accuracy))} m). Step outside and try again.`, 422, { code: 'gps_inaccurate' });
        }
        if (!g.inside) {
          return fail(
            `Location Blocked: You must be present at the physical venue to check in. You are ${g.distance.toFixed(1)} meters away (Geofence limit: ${event.geofence_radius} meters).`,
            422,
            { code: 'outside_geofence', distance_m: Math.round(g.distance * 10) / 10 },
          );
        }
      }
      const row: AttendanceRow = {
        id: nextId(db.t.attendances),
        shift_id: shift.id,
        volunteer_id: v.id,
        check_in_time: nowIso(),
        check_out_time: null,
        qr_verified: true,
        latitude: Number(b.latitude),
        longitude: Number(b.longitude),
        signature_data: null,
        hours_status: 'pending',
        verified_hours: null,
        created_at: nowIso(),
        check_in_method: 'self',
        flags: [],
      };
      db.t.attendances.push(row);
      return ok(res.attendance(row), 'Check-in verified successfully. Welcome to your shift!', 201);
    }),
  ),

  http.post(
    api('/volunteer/check-out'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, { shift_id: { required: true, custom: (v) => (find.shift(Number(v)) ? null : 'The selected shift id is invalid.') } });
      if (invalid) return invalid;
      const v = actor.volunteer!;
      const att = db.t.attendances.find((a) => a.shift_id === Number(b.shift_id) && a.volunteer_id === v.id && !a.check_out_time);
      if (!att) return fail('No active check-in record found for this shift.', 404, { code: 'not_checked_in' });
      const shift = find.shift(att.shift_id)!;
      const out = new Date();
      const minutesEarly = Math.round((new Date(shift.end_time).getTime() - out.getTime()) / 60_000);
      const reason = String(b.reason ?? '').trim();
      if (minutesEarly > 15 && !reason) {
        return fail(`You are leaving before the shift ends. Tell your coordinator why.`, 422, { code: 'reason_required', minutes_early: minutesEarly });
      }
      att.check_out_time = out.toISOString();
      att.check_out_method = 'self';
      att.check_out_reason = reason || null;
      if (minutesEarly > 15) att.flags = [...new Set([...(att.flags ?? []), 'left_early'])];
      const hours = Math.round(((out.getTime() - new Date(att.check_in_time).getTime()) / 3_600_000) * 100) / 100;
      // Hours are credited when a coordinator verifies them.
      return ok(
        {
          ...res.attendance(att),
          check_in: dateTimeString(att.check_in_time),
          check_out: dateTimeString(att.check_out_time),
          hours_logged: hours,
          cumulative_hours: v.total_hours,
          impact_score: v.impact_score,
        },
        'Check-out completed. Thank you for your service!',
      );
    }),
  ),

  http.post(
    api('/volunteer/check-out/undo'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const b = await body(request);
      const att = db.t.attendances.filter((a) => a.shift_id === Number(b.shift_id) && a.volunteer_id === actor.volunteer!.id && a.check_out_time).at(-1);
      if (!att || !res.attendance(att).can_resume) return fail('It is too late to resume this shift yourself. Ask the coordinator to check you back in.', 422, { code: 'resume_expired' });
      att.check_out_time = null;
      att.check_out_method = null;
      att.check_out_reason = null;
      att.flags = [...new Set([...(att.flags ?? []).filter((f) => f !== 'left_early'), 'resumed'])];
      return ok(res.attendance(att), 'You are back on shift.');
    }),
  ),

  http.post(
    api('/volunteer/attendance/ping'),
    authed(['Volunteer'], () => ok({ inside: true, distance_m: 0, stored: true })),
  ),

  http.get(
    api('/volunteer/certificates'),
    authed(['Volunteer'], ({ actor }) =>
      ok(
        db.t.certificates
          .filter((c) => c.volunteer_id === actor.volunteer!.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((c) => res.certificate(c, ORIGIN)),
      ),
    ),
  ),

  http.get(
    api('/volunteer/certificates/:certificateId/download'),
    authed(['Volunteer'], (ctx) => {
      const cert = db.t.certificates.find((c) => c.id === param(ctx, 'certificateId'));
      if (!cert) return fail('Target database resource not found.', 404);
      // Mock serves a printable SVG so the download flow can be exercised end-to-end.
      const v = find.volunteer(cert.volunteer_id);
      const name = (v && find.user(v.user_id)?.full_name) ?? 'Volunteer';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="790"><rect width="100%" height="100%" fill="#F3F6F4"/><text x="80" y="160" font-family="sans-serif" font-size="56" fill="#0C2426">Certificate of Service</text><text x="80" y="260" font-family="sans-serif" font-size="34" fill="#0C2426">${name}</text><text x="80" y="320" font-family="sans-serif" font-size="24" fill="#4C6663">${cert.milestone_hours} verified volunteer hours · ${find.org(cert.org_id)?.name ?? ''}</text><text x="80" y="700" font-family="monospace" font-size="18" fill="#4C6663">VMS-${String(cert.id).padStart(5, '0')} · issued ${cert.issued_date}</text></svg>`;
      return new HttpResponse(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Content-Disposition': `attachment; filename="VMS-${String(cert.id).padStart(5, '0')}.svg"` },
      });
    }),
  ),
];
