/** PENDING-BE handlers for the volunteer portal. See docs/PENDING_BACKEND_CONTRACTS.md. */
import { http } from 'msw';
import { db, find, nextId, nowIso, res } from '../../db';
import { api, authed, fail, json, ok, param } from '../utils';

const MAX_BYTES = 2 * 1024 * 1024;
const MIMES = ['application/pdf', 'image/png', 'image/jpeg'];
const TYPES = ['certification', 'id_proof', 'parental_consent', 'medical_clearance'];

export const volunteerPending = [
  // G8 — event detail with shifts (+ confirmed_count per shift)
  http.get(
    api('/volunteer/events/:eventId'),
    authed(['Volunteer'], (ctx) => {
      const e = find.event(param(ctx, 'eventId'));
      if (!e || e.org_id !== ctx.actor.user.org_id) return fail('Target database resource not found.', 404);
      return ok(res.event(e, { shifts: true, matchFor: ctx.actor.volunteer!.skills }));
    }),
  ),

  // G9 — attendance history
  http.get(
    api('/volunteer/attendance'),
    authed(['Volunteer'], ({ actor }) =>
      ok(
        db.t.attendances
          .filter((a) => a.volunteer_id === actor.volunteer!.id)
          .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time))
          .map((a) => res.attendance(a, { shift: true })),
      ),
    ),
  ),

  // G10 — monthly impact history (last 12 months)
  http.get(
    api('/volunteer/impact/history'),
    authed(['Volunteer'], ({ actor }) => {
      const v = actor.volunteer!;
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, hours: 0, shifts: 0 };
      });
      for (const a of db.t.attendances.filter((x) => x.volunteer_id === v.id && x.check_out_time)) {
        const m = months.find((x) => a.check_in_time.startsWith(x.key));
        if (!m) continue;
        m.hours += (new Date(a.check_out_time!).getTime() - new Date(a.check_in_time).getTime()) / 3_600_000;
        m.shifts += 1;
      }
      // Hours logged before the attendance history (seed baseline) are spread over the oldest months.
      const tracked = months.reduce((s, m) => s + m.hours, 0);
      const baseline = Math.max(0, v.total_hours - tracked);
      months.slice(0, 6).forEach((m, i) => (m.hours += (baseline / 6) * (0.6 + (i % 3) * 0.3)));
      let cumulative = 0;
      return ok(
        months.map((m) => {
          cumulative += m.hours;
          return { month: m.key, hours: Math.round(m.hours * 10) / 10, shifts: m.shifts, impact_score: Math.round(Math.min(v.impact_score, (cumulative / Math.max(1, v.total_hours)) * v.impact_score) * 10) / 10 };
        }),
      );
    }),
  ),

  // G11 — chat history
  http.get(
    api('/volunteer/chat/history'),
    authed(['Volunteer'], ({ actor }) => ok((db.t.chat[actor.volunteer!.id] ?? []).map((t) => ({ role: t.role, content: t.text, created_at: t.at })))),
  ),
  http.delete(
    api('/volunteer/chat/history'),
    authed(['Volunteer'], ({ actor }) => {
      delete db.t.chat[actor.volunteer!.id];
      return json({ status: 'success', message: 'Conversation cleared.' });
    }),
  ),

  // G6 — documents
  http.get(
    api('/volunteer/documents'),
    authed(['Volunteer'], ({ actor }) =>
      ok(db.t.documents.filter((d) => d.volunteer_id === actor.volunteer!.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((d) => res.document(d))),
    ),
  ),
  http.post(
    api('/volunteer/documents'),
    authed(['Volunteer'], async ({ request, actor }) => {
      const form = await request.formData();
      const file = form.get('file');
      const type = String(form.get('document_type') ?? '');
      const title = String(form.get('title') ?? '').trim();
      const errors: Record<string, string[]> = {};
      if (!TYPES.includes(type)) errors.document_type = ['The selected document type is invalid.'];
      if (!title) errors.title = ['The title field is required.'];
      else if (title.length > 150) errors.title = ['The title field must not be greater than 150 characters.'];
      if (!(file instanceof File)) errors.file = ['The file field is required.'];
      else if (!MIMES.includes(file.type)) errors.file = ['The file field must be a file of type: pdf, png, jpg, jpeg.'];
      else if (file.size > MAX_BYTES) errors.file = ['The file field must not be greater than 2048 kilobytes.'];
      const keys = Object.keys(errors);
      if (keys.length) return json({ message: errors[keys[0]!]![0], errors }, 422);
      const f = file as File;
      const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(f) : '/mock-files/first-aid-certificate.svg';
      const row = { id: nextId(db.t.documents), org_id: actor.user.org_id!, volunteer_id: actor.volunteer!.id, document_type: type as 'certification', title, file_url: url, mime_type: f.type, file_size_bytes: f.size, verification_status: 'pending' as const, coordinator_notes: null, verified_by: null, verified_at: null, created_at: nowIso() };
      db.t.documents.unshift(row);
      return ok(res.document(row), 'Document uploaded. A coordinator will review it.', 201);
    }),
  ),
  http.delete(
    api('/volunteer/documents/:id'),
    authed(['Volunteer'], (ctx) => {
      const d = db.t.documents.find((x) => x.id === param(ctx, 'id') && x.volunteer_id === ctx.actor.volunteer!.id);
      if (!d) return fail('Target database resource not found.', 404);
      if (d.verification_status === 'verified') return fail('Verified documents cannot be deleted.', 422);
      db.t.documents = db.t.documents.filter((x) => x.id !== d.id);
      return json({ status: 'success', message: 'Document deleted.' });
    }),
  ),
];
