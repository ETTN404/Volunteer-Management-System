/** PENDING-BE handlers for coordinator, org admin and platform consoles. See docs/PENDING_BACKEND_CONTRACTS.md. */
import { http, HttpResponse } from 'msw';
import { db, find, nowIso, res, audit, confirmedCount, dateTimeString } from '../../db';
import { api, authed, body, fail, json, ok, param, validate } from '../utils';

const staff = ['Coordinator', 'OrgAdmin'] as const;
const STAFF = [...staff];
const NAIVE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const orgShift = (shiftId: number, orgId: number | null) => {
  const s = find.shift(shiftId);
  return s && find.event(s.event_id)?.org_id === orgId ? s : undefined;
};
const hoursOf = (a: { check_in_time: string; check_out_time: string | null }) =>
  a.check_out_time ? (new Date(a.check_out_time).getTime() - new Date(a.check_in_time).getTime()) / 3_600_000 : 0;

const page = <T,>(rows: T[], url: URL, per = 50) => {
  const perPage = Number(url.searchParams.get('per_page') ?? per);
  const current = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const last = Math.max(1, Math.ceil(rows.length / perPage));
  return { data: rows.slice((current - 1) * perPage, current * perPage), pagination: { current_page: current, last_page: last, per_page: perPage, total: rows.length } };
};

/** Same readable shape as App\Services\AuditPresenter. */
const presentLog = (l: (typeof db.t.audit)[number]) => {
  const actor = l.user_id ? find.user(l.user_id) : undefined;
  const old = (l.old_values ?? {}) as Record<string, unknown>;
  const nw = (l.new_values ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(old), ...Object.keys(nw)])].filter((k) => k !== 'org_name');
  return {
    ...l,
    created_at: dateTimeString(l.created_at),
    action_label: l.action.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
    actor: actor ? { id: actor.id, name: actor.full_name, email: actor.email, role: actor.role } : null,
    organization: l.org_id ? (find.org(l.org_id)?.name ?? null) : null,
    target_type: l.model_type ? String(l.model_type).split('\\').pop() : null,
    target_label: (nw.org_name ?? old.org_name ?? nw.title ?? nw.full_name ?? null) as string | null,
    changes: keys.filter((k) => JSON.stringify(old[k]) !== JSON.stringify(nw[k])).map((k) => ({ field: k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), from: old[k] == null ? '—' : String(old[k]), to: nw[k] == null ? '—' : String(nw[k]) })),
  };
};

const auditCsv = (rows: ReturnType<typeof presentLog>[]) =>
  '\uFEFFDate (UTC),Action,Done by,Organization,Changes\n' +
  rows.map((r) => [r.created_at, r.action_label, r.actor?.name ?? 'System', r.organization ?? 'Platform', r.changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join('; ')].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

const filterLogs = (url: URL, orgId?: number | null) =>
  db.t.audit.filter((l) => {
    const action = url.searchParams.get('action');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const org = url.searchParams.get('org_id');
    return (
      (orgId === undefined || l.org_id === orgId) &&
      (!action || l.action.startsWith(action)) &&
      (!org || l.org_id === Number(org)) &&
      (!from || l.created_at.slice(0, 10) >= from) &&
      (!to || l.created_at.slice(0, 10) <= to)
    );
  });

export const staffPending = [
  // G17 — coordinator dashboard counters
  http.get(
    api('/coordinator/dashboard'),
    authed(STAFF, ({ actor }) => {
      const orgId = actor.user.org_id;
      const eventIds = db.t.events.filter((e) => e.org_id === orgId).map((e) => e.id);
      const shifts = db.t.shifts.filter((s) => eventIds.includes(s.event_id));
      const shiftIds = shifts.map((s) => s.id);
      const now = new Date();
      const isToday = (iso: string) => new Date(iso).toDateString() === now.toDateString();
      const monthKey = now.toISOString().slice(0, 7);
      return ok({
        shifts_today: shifts.filter((s) => isToday(s.start_time)).length,
        checked_in_now: db.t.attendances.filter((a) => shiftIds.includes(a.shift_id) && !a.check_out_time).length,
        pending_applications: db.t.assignments.filter((a) => shiftIds.includes(a.shift_id) && a.status === 'pending').length,
        underfilled_shifts: shifts.filter((s) => new Date(s.start_time) > now && confirmedCount(s.id) < s.capacity * 0.5).length,
        hours_this_month: Math.round(db.t.attendances.filter((a) => shiftIds.includes(a.shift_id) && a.check_in_time.startsWith(monthKey)).reduce((s, a) => s + hoursOf(a), 0) * 10) / 10,
        active_volunteers: new Set(db.t.assignments.filter((a) => shiftIds.includes(a.shift_id) && a.status === 'confirmed').map((a) => a.volunteer_id)).size,
      });
    }),
  ),

  // G12 — shift edit / delete
  http.patch(
    api('/coordinator/shifts/:shiftId'),
    authed(STAFF, async (ctx) => {
      const s = orgShift(param(ctx, 'shiftId'), ctx.actor.user.org_id);
      if (!s) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, {
        start_time: { sometimes: true, custom: (v) => (typeof v === 'string' && NAIVE.test(v) ? null : 'The start time field must match the format Y-m-d H:i:s.') },
        end_time: { sometimes: true, custom: (v) => (typeof v === 'string' && NAIVE.test(v) ? null : 'The end time field must match the format Y-m-d H:i:s.') },
        capacity: { sometimes: true, type: 'integer', min: 1, max: 10000, custom: (v) => (Number(v) < confirmedCount(s.id) ? `Capacity cannot be lower than the ${confirmedCount(s.id)} confirmed volunteers.` : null) },
        required_skills: { sometimes: true, type: 'array' },
      });
      if (invalid) return invalid;
      const utc = (x: string) => `${x.replace(' ', 'T')}.000Z`;
      if (b.start_time) s.start_time = utc(String(b.start_time));
      if (b.end_time) s.end_time = utc(String(b.end_time));
      if (s.end_time <= s.start_time) return json({ message: 'The end time field must be a date after start time.', errors: { end_time: ['The end time field must be a date after start time.'] } }, 422);
      if (b.capacity != null) s.capacity = Number(b.capacity);
      if (Array.isArray(b.required_skills)) s.required_skills = b.required_skills as string[];
      audit('shift.updated', ctx.actor.user, { type: 'Shift', id: s.id });
      return ok(res.shift(s), 'Shift updated successfully.');
    }),
  ),
  http.delete(
    api('/coordinator/shifts/:shiftId'),
    authed(STAFF, (ctx) => {
      const s = orgShift(param(ctx, 'shiftId'), ctx.actor.user.org_id);
      if (!s) return fail('Target database resource not found.', 404);
      if (db.t.attendances.some((a) => a.shift_id === s.id)) return fail('Volunteers already checked in to this shift, so it cannot be deleted.');
      const affected = db.t.assignments.filter((a) => a.shift_id === s.id && (a.status === 'pending' || a.status === 'confirmed'));
      affected.forEach((a) => (a.status = 'cancelled'));
      db.t.shifts = db.t.shifts.filter((x) => x.id !== s.id);
      audit('shift.deleted', ctx.actor.user, null, { shift_id: s.id }, {});
      return ok({ volunteers_notified: affected.length }, affected.length ? `Shift deleted. ${affected.length} volunteer(s) were notified.` : 'Shift deleted.');
    }),
  ),

  // G13 — live roster for a shift
  http.get(
    api('/coordinator/shifts/:shiftId/attendance'),
    authed(STAFF, (ctx) => {
      const s = orgShift(param(ctx, 'shiftId'), ctx.actor.user.org_id);
      if (!s) return fail('Target database resource not found.', 404);
      const rows = db.t.assignments
        .filter((a) => a.shift_id === s.id && (a.status === 'confirmed' || a.status === 'pending' || a.status === 'removed'))
        .map((a) => {
          const att = db.t.attendances.filter((x) => x.shift_id === s.id && x.volunteer_id === a.volunteer_id).sort((x, y) => y.check_in_time.localeCompare(x.check_in_time))[0];
          return { assignment_id: a.id, status: a.status, volunteer: res.volunteer(find.volunteer(a.volunteer_id)!, { user: true }), attendance: att ? res.attendance(att) : null };
        });
      const ev = find.event(s.event_id)!;
      const atts = db.t.attendances.filter((x) => x.shift_id === s.id);
      const confirmed = rows.filter((r) => r.status === 'confirmed').length;
      return ok(rows, undefined, 200, {
        meta: {
          shift: { ...res.shift(s), event: { id: ev.id, title: ev.title, location: ev.location, geofence_radius: ev.geofence_radius } },
          capacity: s.capacity,
          confirmed,
          checked_in: atts.filter((x) => !x.check_out_time).length,
          checked_out: atts.filter((x) => x.check_out_time).length,
          left_early: atts.filter((x) => (x.flags ?? []).includes('left_early')).length,
          open_places: Math.max(0, s.capacity - confirmed),
          policy: { checkin_before_minutes: 15, checkin_after_minutes: 30, qr_window_seconds: 30, early_checkout_minutes: 15, undo_checkout_minutes: 10, auto_checkout_grace: 30, max_gps_accuracy: 150, ping_interval_minutes: 5, require_qr: true, auto_verify_hours: false },
        },
      });
    }),
  ),

  // G16 — urgent broadcast preview (BR-07)
  http.get(
    api('/coordinator/shifts/:shiftId/broadcast-preview'),
    authed(STAFF, (ctx) => {
      const s = orgShift(param(ctx, 'shiftId'), ctx.actor.user.org_id);
      if (!s) return fail('Target database resource not found.', 404);
      const required = s.required_skills.map((x) => x.toLowerCase());
      const assigned = new Set(db.t.assignments.filter((a) => a.shift_id === s.id).map((a) => a.volunteer_id));
      const matches = db.t.volunteers.filter((v) => {
        const u = find.user(v.user_id);
        return u?.org_id === ctx.actor.user.org_id && u.is_active && !assigned.has(v.id) && (required.length === 0 || required.some((r) => v.skills.map((x) => x.toLowerCase()).includes(r)));
      });
      return ok({ matching_volunteers: matches.length, sample: matches.slice(0, 5).map((v) => ({ id: v.id, full_name: find.user(v.user_id)!.full_name, skills: v.skills })), remaining_slots: Math.max(0, s.capacity - confirmedCount(s.id)) });
    }),
  ),

  // G14 — hours verification (BR-06)
  http.get(
    api('/coordinator/attendance/pending'),
    authed(STAFF, ({ actor, url }) => {
      const status = url.searchParams.get('status') ?? 'pending';
      const eventIds = db.t.events.filter((e) => e.org_id === actor.user.org_id).map((e) => e.id);
      const shiftIds = db.t.shifts.filter((s) => eventIds.includes(s.event_id)).map((s) => s.id);
      return ok(
        db.t.attendances
          .filter((a) => shiftIds.includes(a.shift_id) && a.check_out_time && (status === 'all' || a.hours_status === status))
          .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time))
          .map((a) => {
            const sh = find.shift(a.shift_id)!;
            return {
              ...res.attendance(a, { shift: true }),
              volunteer: res.volunteer(find.volunteer(a.volunteer_id)!, { user: true }),
              hours: Math.round(hoursOf(a) * 100) / 100,
              scheduled_hours: Math.round(((new Date(sh.end_time).getTime() - new Date(sh.start_time).getTime()) / 3_600_000) * 100) / 100,
            };
          }),
      );
    }),
  ),
  http.patch(
    api('/coordinator/attendance/:id/verify'),
    authed(STAFF, async (ctx) => {
      const a = db.t.attendances.find((x) => x.id === param(ctx, 'id'));
      if (!a || !orgShift(a.shift_id, ctx.actor.user.org_id)) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, { status: { required: true, in: ['verified', 'adjusted', 'rejected'] }, verified_hours: { type: 'number', min: 0, max: 24, nullable: true }, note: { type: 'string', max: 500, nullable: true } });
      if (invalid) return invalid;
      if (b.status === 'adjusted' && b.verified_hours == null) return json({ message: 'The verified hours field is required when status is adjusted.', errors: { verified_hours: ['The verified hours field is required when status is adjusted.'] } }, 422);
      const before = a.hours_status === 'verified' || a.hours_status === 'adjusted' ? (a.verified_hours ?? 0) : 0;
      a.hours_status = b.status as 'verified';
      a.verified_hours = b.status === 'adjusted' ? Number(b.verified_hours) : b.status === 'verified' ? Math.round(hoursOf(a) * 100) / 100 : 0;
      a.verification_note = (b.note as string) ?? null;
      const vol = find.volunteer(a.volunteer_id);
      if (vol) vol.total_hours = Math.max(0, Math.round((vol.total_hours + (a.verified_hours ?? 0) - before) * 100) / 100);
      audit('attendance.hours_' + String(b.status), ctx.actor.user, { type: 'Attendance', id: a.id }, null, { verified_hours: a.verified_hours, note: b.note ?? null });
      return ok(res.attendance(a), 'Hours updated.');
    }),
  ),

  // G6 — coordinator document review
  http.get(
    api('/coordinator/documents'),
    authed(STAFF, ({ actor, url }) => {
      const status = url.searchParams.get('status');
      return ok(
        db.t.documents
          .filter((d) => d.org_id === actor.user.org_id && (!status || d.verification_status === status))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((d) => res.document(d, { volunteer: true })),
      );
    }),
  ),
  http.patch(
    api('/coordinator/documents/:id/verify'),
    authed(STAFF, async (ctx) => {
      const d = db.t.documents.find((x) => x.id === param(ctx, 'id') && x.org_id === ctx.actor.user.org_id);
      if (!d) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, { status: { required: true, in: ['verified', 'rejected'] }, notes: { type: 'string', max: 1000, nullable: true } });
      if (invalid) return invalid;
      d.verification_status = b.status as 'verified';
      d.coordinator_notes = (b.notes as string) ?? null;
      d.verified_by = ctx.actor.user.id;
      d.verified_at = nowIso();
      const v = find.volunteer(d.volunteer_id);
      if (v && d.document_type === 'parental_consent' && d.verification_status === 'verified') v.parental_consent_verified = true;
      if (v) db.t.notifications.unshift({ id: `n-${Date.now()}`, user_id: v.user_id, type: 'document_reviewed', title: `${d.title} ${d.verification_status}`, body: d.coordinator_notes ?? 'Your coordinator reviewed your document.', action_url: '/v/documents', read_at: null, created_at: nowIso() });
      audit('document.' + d.verification_status, ctx.actor.user, { type: 'VolunteerDocument', id: d.id });
      return ok(res.document(d, { volunteer: true }), `Document ${d.verification_status}.`);
    }),
  ),

  // G7 — skill verification
  http.patch(
    api('/coordinator/volunteers/:volunteerId/skills/:skill'),
    authed(STAFF, async (ctx) => {
      const v = find.volunteer(param(ctx, 'volunteerId'));
      if (!v || find.user(v.user_id)?.org_id !== ctx.actor.user.org_id) return fail('Target database resource not found.', 404);
      const skill = String(ctx.params.skill);
      if (!v.skills.includes(skill)) return fail('Volunteer does not list this skill.');
      const b = await body(ctx.request);
      const invalid = validate(b, { status: { required: true, in: ['verified', 'rejected', 'pending', 'unverified'] } });
      if (invalid) return invalid;
      v.skills_verification = { ...v.skills_verification, [skill]: b.status as 'verified' };
      audit('volunteer.skill_' + String(b.status), ctx.actor.user, { type: 'Volunteer', id: v.id }, null, { skill });
      return ok(res.volunteer(v, { user: true }), 'Skill verification updated.');
    }),
  ),

  // G27 — report export
  http.get(
    api('/coordinator/reports/:id/export'),
    authed(STAFF, (ctx) => {
      const r = db.t.reports.find((x) => x.id === param(ctx, 'id') && x.org_id === ctx.actor.user.org_id);
      if (!r) return fail('Target database resource not found.', 404);
      const csv = `period,total_volunteers,total_hours,generated_at\n${r.period},${r.total_volunteers},${r.total_hours},${dateTimeString(r.created_at)}\n`;
      return new HttpResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="impact-report-${r.id}.csv"` } });
    }),
  ),

  // G18 — org analytics
  http.get(
    api('/admin/analytics'),
    authed(['OrgAdmin'], ({ actor }) => {
      const orgId = actor.user.org_id;
      const users = db.t.users.filter((u) => u.org_id === orgId);
      const vols = db.t.volunteers.filter((v) => users.some((u) => u.id === v.user_id));
      const events = db.t.events.filter((e) => e.org_id === orgId);
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1).toISOString().slice(0, 7));
      const volIds = vols.map((v) => v.id);
      const tracked = months.map((m) => db.t.attendances.filter((a) => volIds.includes(a.volunteer_id) && a.check_in_time.startsWith(m)).reduce((s, a) => s + hoursOf(a), 0));
      // Seeded volunteers carry historical hours from before the attendance log; spread them across the window.
      const baseline = Math.max(0, vols.reduce((s, v) => s + v.total_hours, 0) * 0.35 - tracked.reduce((a, b) => a + b, 0));
      const weights = [0.12, 0.14, 0.15, 0.17, 0.2, 0.22];
      const hoursByMonth = months.map((m, i) => ({ month: m, hours: Math.round((tracked[i]! + baseline * weights[i]!) * 10) / 10 }));
      const skillCount: Record<string, number> = {};
      vols.forEach((v) => v.skills.forEach((s) => (skillCount[s] = (skillCount[s] ?? 0) + 1)));
      return ok({
        volunteers: vols.length,
        active_volunteers: users.filter((u) => u.role === 'Volunteer' && u.is_active).length,
        coordinators: users.filter((u) => u.role === 'Coordinator').length,
        events: events.length,
        upcoming_events: events.filter((e) => e.status === 'upcoming').length,
        total_hours: Math.round(vols.reduce((s, v) => s + v.total_hours, 0) * 10) / 10,
        hours_by_month: hoursByMonth,
        top_skills: Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count })),
      });
    }),
  ),

  // G19 — coordinator management
  http.patch(
    api('/admin/coordinators/:id'),
    authed(['OrgAdmin'], async (ctx) => {
      const u = db.t.users.find((x) => x.id === param(ctx, 'id') && x.org_id === ctx.actor.user.org_id && x.role === 'Coordinator');
      if (!u) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, {
        first_name: { sometimes: true, type: 'string', max: 60 },
        last_name: { sometimes: true, type: 'string', max: 60 },
        email: { sometimes: true, type: 'email', max: 100, custom: (v) => (db.t.users.some((x) => x.email === v && x.id !== u.id) ? 'The email has already been taken.' : null) },
      });
      if (invalid) return invalid;
      if (b.first_name || b.last_name) u.full_name = `${b.first_name ?? u.full_name.split(' ')[0]} ${b.last_name ?? u.full_name.split(' ').slice(1).join(' ')}`.trim();
      if (b.email) u.email = String(b.email);
      audit('user.coordinator_updated', ctx.actor.user, { type: 'User', id: u.id });
      return ok(res.user(u), 'Coordinator updated.');
    }),
  ),
  http.patch(
    api('/admin/coordinators/:id/status'),
    authed(['OrgAdmin'], (ctx) => {
      const u = db.t.users.find((x) => x.id === param(ctx, 'id') && x.org_id === ctx.actor.user.org_id && x.role === 'Coordinator');
      if (!u) return fail('Target database resource not found.', 404);
      u.is_active = !u.is_active;
      audit(u.is_active ? 'user.coordinator_reactivated' : 'user.coordinator_deactivated', ctx.actor.user, { type: 'User', id: u.id });
      return json({ status: 'success', message: u.is_active ? 'Coordinator reactivated.' : 'Coordinator deactivated.', is_active: u.is_active });
    }),
  ),

  // G20 — branding: logo upload (primary_color & subdomain ride on PATCH /admin/organization)
  http.post(
    api('/admin/organization/logo'),
    authed(['OrgAdmin'], async ({ request, actor }) => {
      const form = await request.formData();
      const file = form.get('logo');
      if (!(file instanceof File)) return json({ message: 'The logo field is required.', errors: { logo: ['The logo field is required.'] } }, 422);
      if (file.size > 1024 * 1024) return json({ message: 'The logo field must not be greater than 1024 kilobytes.', errors: { logo: ['The logo field must not be greater than 1024 kilobytes.'] } }, 422);
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      const org = find.org(actor.user.org_id)!;
      org.logo_path = dataUrl;
      return ok(res.org(org), 'Logo updated.');
    }),
  ),

  // G21 — org-scoped audit trail
  http.get(
    api('/admin/audit-logs'),
    authed(['OrgAdmin'], ({ actor, url }) => {
      const rows = filterLogs(url, actor.user.org_id).map(presentLog);
      if (url.searchParams.get('format') === 'csv') return new HttpResponse(auditCsv(rows), { headers: { 'Content-Type': 'text/csv' } });
      const p = page(rows, url);
      return ok(p.data, undefined, 200, { pagination: p.pagination });
    }),
  ),

  // G22 — org admin accounts across tenants
  http.get(
    api('/superadmin/admins'),
    authed(['SuperAdmin'], ({ url }) => {
      const p = page(db.t.users.filter((u) => u.role === 'OrgAdmin').map((u) => ({ ...res.user(u, { organization: true }), invitation_pending: false })), url);
      return ok(p.data, undefined, 200, { pagination: p.pagination });
    }),
  ),
  http.patch(
    api('/superadmin/users/:id/status'),
    authed(['SuperAdmin'], (ctx) => {
      const u = db.t.users.find((x) => x.id === param(ctx, 'id') && x.role !== 'SuperAdmin');
      if (!u) return fail('Target database resource not found.', 404);
      u.is_active = !u.is_active;
      return json({ status: 'success', message: u.is_active ? 'Account reactivated.' : 'Account deactivated.', is_active: u.is_active });
    }),
  ),
  http.get(
    api('/superadmin/audit-logs'),
    authed(['SuperAdmin'], ({ url }) => {
      const rows = filterLogs(url).map(presentLog);
      if (url.searchParams.get('format') === 'csv') return new HttpResponse(auditCsv(rows), { headers: { 'Content-Type': 'text/csv' } });
      const p = page(rows, url);
      return ok(p.data, undefined, 200, { pagination: p.pagination });
    }),
  ),
  http.patch(
    api('/superadmin/admins/:id/status'),
    authed(['SuperAdmin'], (ctx) => {
      const u = db.t.users.find((x) => x.id === param(ctx, 'id') && x.role === 'OrgAdmin');
      if (!u) return fail('Target database resource not found.', 404);
      u.is_active = !u.is_active;
      audit(u.is_active ? 'user.admin_reactivated' : 'user.admin_deactivated', ctx.actor.user, { type: 'User', id: u.id });
      return json({ status: 'success', message: u.is_active ? 'Admin reactivated.' : 'Admin deactivated.', is_active: u.is_active });
    }),
  ),

  // G23 — platform growth timeseries (12 months)
  http.get(
    api('/superadmin/metrics/timeseries'),
    authed(['SuperAdmin'], () => {
      const now = new Date();
      return ok(
        Array.from({ length: 12 }, (_, i) => {
          const end = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 0, 23, 59);
          const endIso = end.toISOString();
          return {
            date: endIso.slice(0, 7),
            organizations: db.t.organizations.filter((o) => o.created_at <= endIso).length,
            users: db.t.users.filter((u) => u.created_at <= endIso).length,
            hours: Math.round(db.t.attendances.filter((a) => a.check_out_time && a.check_in_time.startsWith(endIso.slice(0, 7))).reduce((s, a) => s + hoursOf(a), 0) + (i < 9 ? 60 + i * 35 : 0)),
          };
        }),
      );
    }),
  ),

  // G24 — platform user directory
  http.get(
    api('/superadmin/users'),
    authed(['SuperAdmin'], ({ url }) => {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const role = url.searchParams.get('role');
      const p = page(
        db.t.users.filter((u) => (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) && (!role || u.role === role)).map((u) => res.user(u, { organization: true })),
        url,
      );
      return ok(p.data, undefined, 200, { pagination: p.pagination });
    }),
  ),
];
