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
      if (db.t.assignments.some((a) => a.shift_id === shiftId && a.volunteer_id === v.id)) {
        return fail('You have already applied for this shift.');
      }
      const overlap = db.t.assignments.find((a) => {
        if (a.volunteer_id !== v.id || a.status === 'cancelled') return false;
        const s = find.shift(a.shift_id);
        return s && s.start_time < shift.end_time && s.end_time > shift.start_time;
      });
      if (overlap) {
        return fail('Scheduling Conflict: This shift overlaps with another shift you are already scheduled for or have applied to.', 422, {
          conflict_shift_id: overlap.shift_id,
        });
      }
      const row = { id: nextId(db.t.assignments), shift_id: shiftId, volunteer_id: v.id, status: 'pending' as const, assigned_at: null, decline_reason: null, created_at: nowIso() };
      db.t.assignments.push(row);
      return ok(res.assignment(row), 'Application submitted successfully. Under coordinator review.', 201);
    }),
  ),

  http.delete(
    api('/volunteer/apply/:assignmentId'),
    authed(['Volunteer'], (ctx) => {
      const id = param(ctx, 'assignmentId');
      const idx = db.t.assignments.findIndex((a) => a.id === id && a.volunteer_id === ctx.actor.volunteer!.id && a.status === 'pending');
      if (idx < 0) return fail('Target database resource not found.', 404);
      db.t.assignments.splice(idx, 1);
      return json({ status: 'success', message: 'Shift application withdrawn successfully.' });
    }),
  ),

  http.get(
    api('/volunteer/schedule'),
    authed(['Volunteer'], ({ actor }) => {
      const rows = db.t.assignments
        .filter((a) => a.volunteer_id === actor.volunteer!.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((a) => res.assignment(a, { shift: true, shiftEvent: true }));
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
        latitude: { required: true, type: 'number', min: -90, max: 90 },
        longitude: { required: true, type: 'number', min: -180, max: 180 },
        client_timestamp: { required: true, type: 'date' },
      });
      if (invalid) return invalid;

      const clientTime = new Date(String(b.client_timestamp));
      if (Math.abs(Date.now() - clientTime.getTime()) / 60_000 > 2) {
        return fail('Security Error: High time-drift detected. Ensure your device clock is synced accurately to the network.');
      }
      const shift = find.shift(Number(b.shift_id))!;
      const v = actor.volunteer!;
      const assignment = db.t.assignments.find((a) => a.shift_id === shift.id && a.volunteer_id === v.id && a.status === 'confirmed');
      if (!assignment) return fail('Security Gate: You are not scheduled or approved for this shift.', 403);
      if (db.t.attendances.some((a) => a.shift_id === shift.id && a.volunteer_id === v.id && !a.check_out_time)) {
        return fail('You are already checked in to this shift.');
      }
      const start = new Date(shift.start_time).getTime();
      const opens = start - 15 * 60_000;
      const closes = start + 30 * 60_000;
      if (Date.now() < opens || Date.now() > closes) {
        const t = (ms: number) => dateTimeString(new Date(ms).toISOString()).slice(11);
        return fail(`Check-in is unavailable. Check-in window is open between ${t(opens)} and ${t(closes)}.`);
      }
      if (shift.qr_code_signature !== b.qr_code_signature || (shift.qr_expires_at && new Date(shift.qr_expires_at) < new Date())) {
        return fail('Validation Failed: Scanned QR code signature is invalid or has expired.');
      }
      const event = find.event(shift.event_id)!;
      if (event.latitude != null && event.longitude != null) {
        const g = checkGeofence(
          { latitude: Number(b.latitude), longitude: Number(b.longitude) },
          { latitude: event.latitude, longitude: event.longitude },
          event.geofence_radius,
        );
        if (!g.inside) {
          return fail(
            `Location Blocked: You must be present at the physical venue to check in. You are ${g.distance.toFixed(1)} meters away (Geofence limit: ${event.geofence_radius} meters).`,
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
      if (!att) return fail('No active check-in record found for this shift.', 404);
      const out = new Date();
      att.check_out_time = out.toISOString();
      const hours = Math.round(((out.getTime() - new Date(att.check_in_time).getTime()) / 3_600_000) * 100) / 100;
      const shift = find.shift(att.shift_id)!;

      let multiplier = 1;
      if (shift.required_skills.length >= 3) multiplier += 0.2;
      if (att.check_in_time <= shift.start_time) multiplier += 0.15;
      const r = reliability(v.id);
      if (r.attendance_rate >= 90) multiplier += 0.1;
      const increment = Math.min(Math.round(hours * 0.1 * multiplier * 100) / 100, Math.max(0, 100 - v.impact_score));

      const prev = v.total_hours;
      v.total_hours = Math.round((prev + hours) * 100) / 100;
      v.impact_score = Math.min(100, Math.round((v.impact_score + increment) * 100) / 100);
      const milestones = CERTIFICATE_MILESTONES.filter((m) => prev < m && v.total_hours >= m);
      for (const m of milestones) {
        const id = nextId(db.t.certificates);
        db.t.certificates.push({ id, volunteer_id: v.id, org_id: actor.user.org_id ?? 1, issued_date: nowIso().slice(0, 10), milestone_hours: m, file_path: `storage/certificates/VMS-${String(id).padStart(5, '0')}.pdf`, created_at: nowIso() });
      }
      return ok(
        {
          check_in: dateTimeString(att.check_in_time),
          check_out: dateTimeString(att.check_out_time),
          hours_logged: hours,
          cumulative_hours: v.total_hours,
          impact_score: v.impact_score,
          milestones_reached: milestones,
        },
        'Check-out completed. Thank you for your service!',
      );
    }),
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
