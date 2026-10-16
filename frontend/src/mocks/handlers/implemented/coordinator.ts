import { http } from 'msw';
import { db, find, nextId, nowIso, paginate, res, audit, confirmedCount, dateTimeString } from '../../db';
import type { EventRow, ShiftRow } from '../../db/schema';
import { authed, body, fail, json, ok, ORIGIN, param, validate, api, today } from '../utils';
import { profilePayload } from './volunteer';
import { CERTIFICATE_MILESTONES } from '@/shared/lib/skills';

const STAFF = ['Coordinator', 'OrgAdmin'] as const;
const staff = [...STAFF];

const inOrg = (e: EventRow | undefined, orgId: number | null) => !!e && e.org_id === orgId;

const NAIVE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export const coordinatorHandlers = [
  /* ---------------- Events ---------------- */
  http.post(
    api('/coordinator/events'),
    authed(staff, async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        title: { required: true, type: 'string', max: 150 },
        description: { type: 'string', max: 5000, nullable: true },
        location: { required: true, type: 'string', max: 255 },
        latitude: { type: 'number', min: -90, max: 90, nullable: true },
        longitude: { type: 'number', min: -180, max: 180, nullable: true },
        start_date: { required: true, type: 'date', custom: (v) => (new Date(String(v)) < today() ? 'The start date field must be a date after or equal to today.' : null) },
        end_date: { required: true, type: 'date', custom: (v, all) => (String(v) < String(all.start_date) ? 'The end date field must be a date after or equal to start date.' : null) },
        geofence_radius: { type: 'integer', min: 50, max: 5000, nullable: true },
      });
      if (invalid) return invalid;
      const row: EventRow = {
        id: nextId(db.t.events),
        org_id: actor.user.org_id!,
        title: String(b.title),
        description: (b.description as string) ?? null,
        location: String(b.location),
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        start_date: String(b.start_date).slice(0, 10),
        end_date: String(b.end_date).slice(0, 10),
        status: 'upcoming',
        geofence_radius: b.geofence_radius != null ? Number(b.geofence_radius) : 100,
        created_at: nowIso(),
      };
      db.t.events.push(row);
      return ok(res.event(row), 'Event created successfully.', 201);
    }),
  ),

  http.get(
    api('/coordinator/events'),
    authed(staff, ({ actor, url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      const events = db.t.events.filter((e) => e.org_id === actor.user.org_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { items, pagination } = paginate(events, page, 15);
      return ok(items.map((e) => res.event(e, { shifts: true })), undefined, 200, { pagination });
    }),
  ),

  http.get(
    api('/coordinator/events/:eventId'),
    authed(staff, (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!inOrg(e, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      return ok(res.event(e!, { shifts: true }));
    }),
  ),

  http.patch(
    api('/coordinator/events/:eventId'),
    authed(staff, async (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!inOrg(e, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, {
        title: { sometimes: true, type: 'string', max: 150 },
        description: { sometimes: true, type: 'string', max: 5000, nullable: true },
        location: { sometimes: true, type: 'string', max: 255 },
        status: { sometimes: true, in: ['upcoming', 'ongoing', 'completed', 'cancelled'] },
        geofence_radius: { sometimes: true, type: 'integer', min: 50, max: 5000 },
      });
      if (invalid) return invalid;
      const old = { title: e!.title, status: e!.status, geofence_radius: e!.geofence_radius };
      // Mirrors $event->update($request->only(['title','description','location','status','geofence_radius'])).
      for (const k of ['title', 'description', 'location', 'status', 'geofence_radius'] as const) {
        if (k in b) (e as unknown as Record<string, unknown>)[k] = b[k];
      }
      audit('event.updated', ctx.actor.user, { type: 'Event', id: e!.id }, old, { title: e!.title, status: e!.status, geofence_radius: e!.geofence_radius });
      return ok(res.event(e!), 'Event updated successfully.');
    }),
  ),

  http.delete(
    api('/coordinator/events/:eventId'),
    authed(staff, (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!inOrg(e, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      const shiftIds = db.t.shifts.filter((s) => s.event_id === e!.id).map((s) => s.id);
      db.t.events = db.t.events.filter((x) => x.id !== e!.id);
      db.t.shifts = db.t.shifts.filter((s) => s.event_id !== e!.id);
      db.t.assignments = db.t.assignments.filter((a) => !shiftIds.includes(a.shift_id));
      audit('event.deleted', ctx.actor.user, null, { title: e!.title }, {});
      return json({ status: 'success', message: 'Event deleted successfully.' });
    }),
  ),

  http.post(
    api('/coordinator/events/:eventId/shifts'),
    authed(staff, async (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!inOrg(e, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, {
        start_time: { required: true, custom: (v) => (typeof v === 'string' && NAIVE.test(v) ? null : 'The start time field must match the format Y-m-d H:i:s.') },
        end_time: {
          required: true,
          custom: (v, all) =>
            typeof v !== 'string' || !NAIVE.test(v)
              ? 'The end time field must match the format Y-m-d H:i:s.'
              : v <= String(all.start_time)
                ? 'The end time field must be a date after start time.'
                : null,
        },
        required_skills: { type: 'array' },
        capacity: { required: true, type: 'integer', min: 1, max: 10000 },
      });
      if (invalid) return invalid;
      const startDay = String(b.start_time).slice(0, 10);
      const endDay = String(b.end_time).slice(0, 10);
      if (startDay < e!.start_date || endDay > e!.end_date) {
        return fail(`Shift timings must fall within the event boundaries (${e!.start_date} to ${e!.end_date}).`);
      }
      const utc = (s: string) => `${s.replace(' ', 'T')}.000Z`;
      const row: ShiftRow = {
        id: nextId(db.t.shifts),
        event_id: e!.id,
        start_time: utc(String(b.start_time)),
        end_time: utc(String(b.end_time)),
        required_skills: (b.required_skills as string[]) ?? [],
        capacity: Number(b.capacity),
        qr_code_signature: Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        qr_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        created_at: nowIso(),
      };
      db.t.shifts.push(row);
      // Controller returns the raw model (not a Resource).
      return ok({ ...row, start_time: dateTimeString(row.start_time), end_time: dateTimeString(row.end_time), updated_at: row.created_at }, 'Shift created successfully.', 201);
    }),
  ),

  http.get(
    api('/coordinator/shifts/:shiftId/capacity'),
    authed(staff, (ctx) => {
      const s = find.shift(param(ctx, 'shiftId'));
      if (!s) return fail('Target database resource not found.', 404);
      const confirmed = confirmedCount(s.id);
      const remaining = Math.max(0, s.capacity - confirmed);
      return ok({ shift_id: s.id, total_capacity: s.capacity, confirmed_count: confirmed, remaining_slots: remaining, is_full: remaining === 0 });
    }),
  ),

  /* ---------------- Applications ---------------- */
  http.get(
    api('/coordinator/events/:eventId/applications'),
    authed(staff, (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!inOrg(e, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      const shiftIds = db.t.shifts.filter((s) => s.event_id === e!.id).map((s) => s.id);
      return ok(db.t.assignments.filter((a) => shiftIds.includes(a.shift_id)).map((a) => res.assignment(a, { shift: true, volunteer: true })));
    }),
  ),

  http.post(
    api('/coordinator/applications/:assignmentId/approve'),
    authed(staff, async (ctx) => {
      const a = find.assignment(param(ctx, 'assignmentId'));
      if (!a) return fail('Target database resource not found.', 404);
      if (find.eventOfShift(a.shift_id)?.org_id !== ctx.actor.user.org_id) return fail('Unauthorized action.', 403);
      const b = await body(ctx.request);
      const invalid = validate(b, { status: { required: true, in: ['confirmed', 'cancelled'] } });
      if (invalid) return invalid;
      if (b.status === 'confirmed') {
        const shift = find.shift(a.shift_id)!;
        if (confirmedCount(shift.id) >= shift.capacity) return fail('Shift capacity has already been reached.');
      }
      a.status = b.status as 'confirmed' | 'cancelled';
      a.assigned_at = a.status === 'confirmed' ? nowIso() : null;
      a.decline_reason = a.status === 'cancelled' ? ((b.reason as string) ?? null) : null; // PENDING-BE G15
      const v = find.volunteer(a.volunteer_id);
      if (v && a.status === 'confirmed') {
        const e = find.eventOfShift(a.shift_id)!;
        db.t.notifications.unshift({ id: `n-${Date.now()}`, user_id: v.user_id, type: 'shift_approved', title: `You’re confirmed: ${e.title}`, body: 'Your coordinator approved your application.', action_url: '/v/schedule', read_at: null, created_at: nowIso() });
      }
      return ok({ ...a, updated_at: nowIso() }, `Application status updated to ${a.status}.`);
    }),
  ),

  http.get(
    api('/coordinator/applications/:assignmentId/ai-feedback'),
    authed(staff, (ctx) => {
      const a = find.assignment(param(ctx, 'assignmentId'));
      if (!a) return fail('Target database resource not found.', 404);
      const v = find.volunteer(a.volunteer_id)!;
      const name = find.user(v.user_id)?.full_name ?? 'there';
      const shift = find.shift(a.shift_id)!;
      const required = shift.required_skills.map((s) => s.toLowerCase());
      const have = v.skills.map((s) => s.toLowerCase());
      const missing = required.filter((s) => !have.includes(s));
      const feedback =
        required.length === 0
          ? `Hi ${name}, thank you so much for applying to this shift! We do not require any specific skills for this shift, and we would love to have you onboard. We look forward to seeing you soon!`
          : missing.length === 0
            ? `Hi ${name}, your profile has a perfect 100% skills alignment for this shift! We have confirmed your skills and credentials. We are excited to work with you on ${dateTimeString(shift.start_time)}!`
            : `Hi ${name}, we'd love to have you onboard, but we need an updated certificate or experience verification for: ${missing.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')} before shift approval. Could you upload the latest copy?`;
      return json({ status: 'success', assignment_id: String(a.id), missing_skills: missing, ai_drafted_feedback: feedback });
    }),
  ),

  http.post(
    api('/coordinator/applications/:assignmentId/force-checkin'),
    authed(staff, async (ctx) => {
      const a = find.assignment(param(ctx, 'assignmentId'));
      if (!a) return fail('Target database resource not found.', 404);
      if (find.eventOfShift(a.shift_id)?.org_id !== ctx.actor.user.org_id) return fail('Unauthorized action.', 403);
      const b = await body(ctx.request);
      const invalid = validate(b, { signature_data: { required: true, type: 'string' } });
      if (invalid) return invalid;
      if (db.t.attendances.some((x) => x.shift_id === a.shift_id && x.volunteer_id === a.volunteer_id && !x.check_out_time)) {
        return fail('Volunteer is already checked in to this shift.');
      }
      const row = {
        id: nextId(db.t.attendances),
        shift_id: a.shift_id,
        volunteer_id: a.volunteer_id,
        check_in_time: nowIso(),
        check_out_time: null,
        qr_verified: false,
        latitude: null,
        longitude: null,
        signature_data: String(b.signature_data),
        hours_status: 'pending' as const,
        verified_hours: null,
        created_at: nowIso(),
      };
      db.t.attendances.push(row);
      audit('attendance.force_checkin', ctx.actor.user, { type: 'Attendance', id: row.id }, null, { reason: (b.reason as string) ?? 'Coordinator override' });
      return ok(row, 'Coordinator Override Check-in completed. Hand-drawn signature captured.', 201);
    }),
  ),

  http.post(
    api('/coordinator/shifts/:shiftId/qrcode'),
    authed(staff, (ctx) => {
      const s = find.shift(param(ctx, 'shiftId'));
      if (!s) return fail('Target database resource not found.', 404);
      const sig = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}_${Math.floor(Date.now() / 1000)}`;
      s.qr_code_signature = sig;
      // NOTE: the real backend does not refresh qr_expires_at here (see PENDING_BACKEND_CONTRACTS.md §Known backend issues).
      s.qr_expires_at = new Date(Date.now() + 15 * 60_000).toISOString();
      return json({ status: 'success', qr_code_signature: sig, expires_at: dateTimeString(s.qr_expires_at) });
    }),
  ),

  /* ---------------- Volunteers ---------------- */
  http.get(
    api('/coordinator/volunteers'),
    authed(staff, ({ actor, url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      const vols = db.t.volunteers.filter((v) => find.user(v.user_id)?.org_id === actor.user.org_id);
      const { items, pagination } = paginate(vols, page, 15);
      return ok(items.map((v) => res.volunteer(v, { user: true })), undefined, 200, { pagination });
    }),
  ),

  http.get(
    api('/coordinator/volunteers/:volunteerId'),
    authed(staff, (ctx) => {
      const v = find.volunteer(param(ctx, 'volunteerId'));
      if (!v || find.user(v.user_id)?.org_id !== ctx.actor.user.org_id) return fail('Target database resource not found.', 404);
      return ok(profilePayload(v.id));
    }),
  ),

  /* ---------------- Certificates & reports ---------------- */
  http.post(
    api('/coordinator/certificates'),
    authed(staff, async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        volunteer_id: { required: true, custom: (v) => (find.volunteer(Number(v)) ? null : 'The selected volunteer id is invalid.') },
        milestone_hours: { required: true, type: 'number', min: 1, in: CERTIFICATE_MILESTONES as unknown as number[] },
      });
      if (invalid) return invalid;
      const v = find.volunteer(Number(b.volunteer_id))!;
      const m = Number(b.milestone_hours);
      if (v.total_hours < m) return fail(`Volunteer has not reached the ${m} hour milestone yet.`);
      if (db.t.certificates.some((c) => c.volunteer_id === v.id && c.milestone_hours === m)) return fail('Certificate for this milestone already issued.');
      const id = nextId(db.t.certificates);
      const row = { id, volunteer_id: v.id, org_id: actor.user.org_id!, issued_date: nowIso().slice(0, 10), milestone_hours: m, file_path: `storage/certificates/VMS-${String(id).padStart(5, '0')}.pdf`, created_at: nowIso() };
      db.t.certificates.push(row);
      db.t.notifications.unshift({ id: `n-${Date.now()}`, user_id: v.user_id, type: 'certificate_issued', title: `${m}-hour certificate issued`, body: 'Your certificate is ready to download and share.', action_url: '/v/certificates', read_at: null, created_at: nowIso() });
      return ok(row, 'Certificate generated successfully.', 201);
    }),
  ),

  http.post(
    api('/coordinator/reports'),
    authed(staff, async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, { period: { required: true, type: 'string', max: 50 }, async: { type: 'boolean' } });
      if (invalid) return invalid;
      if (b.async) return json({ status: 'success', message: 'Impact report compilation queued in background worker. PII will be anonymized.' }, 202);
      const orgVolIds = db.t.volunteers.filter((v) => find.user(v.user_id)?.org_id === actor.user.org_id).map((v) => v.id);
      const hours = db.t.attendances
        .filter((a) => orgVolIds.includes(a.volunteer_id) && a.check_out_time)
        .reduce((sum, a) => sum + (new Date(a.check_out_time!).getTime() - new Date(a.check_in_time).getTime()) / 3_600_000, 0);
      const id = nextId(db.t.reports);
      const row = { id, org_id: actor.user.org_id!, generated_by: actor.user.id, period: String(b.period), total_volunteers: orgVolIds.length, total_hours: Math.round(hours * 100) / 100, file_path: `storage/reports/report_${id}.csv`, status: 'completed', created_at: nowIso() };
      db.t.reports.unshift(row);
      audit('report.generated', actor.user, { type: 'Report', id }, null, { period: row.period, total_hours: row.total_hours });
      return ok(res.report(row, ORIGIN), 'Impact report compiled successfully. PII has been anonymized.', 201);
    }),
  ),

  http.get(
    api('/coordinator/reports'),
    authed(staff, ({ actor }) => ok(db.t.reports.filter((r) => r.org_id === actor.user.org_id).map((r) => res.report(r, ORIGIN)))),
  ),

  http.get(
    api('/coordinator/reports/:id'),
    authed(staff, (ctx) => {
      const r = db.t.reports.find((x) => x.id === param(ctx, 'id') && x.org_id === ctx.actor.user.org_id);
      return r ? ok(res.report(r, ORIGIN)) : fail('Target database resource not found.', 404);
    }),
  ),

  /* ---------------- Announcements ---------------- */
  http.post(
    api('/coordinator/announcements'),
    authed(staff, async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        title: { required: true, type: 'string', max: 200 },
        message: { required: true, type: 'string', max: 5000 },
        target_audience: { required: true, in: ['all', 'volunteers', 'coordinators'] },
      });
      if (invalid) return invalid;
      const row = { id: nextId(db.t.announcements), org_id: actor.user.org_id!, posted_by: actor.user.id, title: String(b.title), message: String(b.message), target_audience: b.target_audience as 'all', created_at: nowIso() };
      db.t.announcements.unshift(row);
      audit('announcement.created', actor.user, { type: 'Announcement', id: row.id }, null, { title: row.title });
      return ok(res.announcement(row, false), 'Announcement posted successfully.', 201);
    }),
  ),

  http.post(
    api('/coordinator/shifts/:shiftId/broadcast'),
    authed(staff, (ctx) => {
      const s = find.shift(param(ctx, 'shiftId'));
      if (!s) return fail('Target database resource not found.', 404);
      const e = find.event(s.event_id)!;
      if (e.org_id !== ctx.actor.user.org_id) return fail('Unauthorized action.', 403);
      const required = s.required_skills.map((x) => x.toLowerCase());
      const matches = db.t.volunteers.filter(
        (v) => find.user(v.user_id)?.org_id === e.org_id && (required.length === 0 || required.some((r) => v.skills.map((x) => x.toLowerCase()).includes(r))),
      );
      for (const v of matches) {
        db.t.notifications.unshift({ id: `n-${Date.now()}-${v.id}`, user_id: v.user_id, type: 'shift_broadcast', title: `Urgent: ${e.title} needs you`, body: `A shift on ${dateTimeString(s.start_time).slice(0, 16)} matches your skills.`, action_url: `/v/opportunities/${e.id}`, read_at: null, created_at: nowIso() });
      }
      audit('shift.urgent_broadcast', ctx.actor.user, { type: 'Shift', id: s.id });
      return json({ status: 'success', message: 'Urgent shift broadcast queued successfully in background queue.', data: { shift_id: s.id, event: e.title, start_time: s.start_time } }, 202);
    }),
  ),

  http.get(
    api('/announcements'),
    authed('any', ({ actor, url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      // Controller returns every announcement of the org (no audience filter).
      const rows = db.t.announcements.filter((a) => a.org_id === actor.user.org_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { items, pagination } = paginate(rows, page, 15);
      return ok(items.map((a) => res.announcement(a, false)), undefined, 200, { pagination });
    }),
  ),
];
