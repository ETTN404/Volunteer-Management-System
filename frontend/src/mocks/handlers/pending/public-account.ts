/**
 * PENDING-BE handlers: public, password, account & notifications.
 * Each handler is tagged with its gap id (G#) from docs/PENDING_BACKEND_CONTRACTS.md.
 * Delete a handler once Laravel ships the endpoint.
 */
import { http } from 'msw';
import { db, find, nowIso } from '../../db';
import { api, authed, body, fail, json, latency, ok, validate } from '../utils';

export const publicAccountPending = [
  // G1 — organizations a volunteer can join at registration
  http.get(api('/public/organizations'), async () => {
    await latency();
    return ok(
      db.t.organizations
        .filter((o) => o.status === 'active')
        .map((o) => ({
          id: o.id,
          name: o.name,
          logo_url: o.logo_path,
          address: o.address,
          volunteer_count: db.t.users.filter((u) => u.org_id === o.id && u.role === 'Volunteer').length,
        })),
    );
  }),

  // G2 — landing page counters
  http.get(api('/public/stats'), async () => {
    await latency();
    const hours = db.t.volunteers.reduce((s, v) => s + v.total_hours, 0);
    return ok({
      organizations: db.t.organizations.filter((o) => o.status === 'active').length,
      volunteers: db.t.volunteers.length,
      verified_hours: Math.round(hours),
      certificates_issued: db.t.certificates.length,
      shifts_completed: db.t.attendances.filter((a) => a.check_out_time).length,
    });
  }),

  // G3 — forgot / reset password
  http.post(api('/forgot-password'), async ({ request }) => {
    await latency();
    const b = await body(request);
    const invalid = validate(b, { email: { required: true, type: 'email' } });
    if (invalid) return invalid;
    // Always 200 — never reveal whether an email is registered.
    return json({ status: 'success', message: 'If that email is registered, a reset link is on its way.' });
  }),

  http.post(api('/reset-password'), async ({ request }) => {
    await latency();
    const b = await body(request);
    const invalid = validate(b, {
      token: { required: true, type: 'string' },
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', min: 8 },
      password_confirmation: { required: true, custom: (v, all) => (v === all.password ? null : 'The password field confirmation does not match.') },
    });
    if (invalid) return invalid;
    const u = find.userByEmail(String(b.email));
    if (!u || b.token === 'expired') return fail('This password reset token is invalid.');
    u.password = String(b.password);
    return json({ status: 'success', message: 'Your password has been reset.' });
  }),

  // G4 — change password
  http.patch(
    api('/account/password'),
    authed('any', async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        current_password: { required: true, type: 'string', custom: (v) => (v === actor.user.password || actor.user.password === '' ? null : 'The password is incorrect.') },
        password: { required: true, type: 'string', min: 8 },
        password_confirmation: { required: true, custom: (v, all) => (v === all.password ? null : 'The password field confirmation does not match.') },
      });
      if (invalid) return invalid;
      actor.user.password = String(b.password);
      return json({ status: 'success', message: 'Password updated.' });
    }),
  ),

  // G28 — profile photo
  http.post(
    api('/account/photo'),
    authed('any', async ({ request, actor }) => {
      const form = await request.formData();
      const file = form.get('photo');
      if (!(file instanceof File)) return json({ message: 'The photo field is required.', errors: { photo: ['The photo field is required.'] } }, 422);
      if (file.size > 2 * 1024 * 1024) return json({ message: 'The photo field must not be greater than 2048 kilobytes.', errors: { photo: ['The photo field must not be greater than 2048 kilobytes.'] } }, 422);
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      actor.user.profile_photo_path = dataUrl;
      return ok({ profile_photo_url: dataUrl }, 'Photo updated.');
    }),
  ),

  // G25 — notifications inbox
  http.get(
    api('/notifications'),
    authed('any', ({ actor, url }) => {
      const unreadOnly = url.searchParams.get('unread') === '1';
      const rows = db.t.notifications
        .filter((n) => n.user_id === actor.user.id && (!unreadOnly || !n.read_at))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50)
        .map(({ user_id: _u, ...n }) => n);
      return ok(rows, undefined, 200, { unread_count: db.t.notifications.filter((n) => n.user_id === actor.user.id && !n.read_at).length });
    }),
  ),

  http.post(
    api('/notifications/:id/read'),
    authed('any', ({ actor, params }) => {
      const n = db.t.notifications.find((x) => x.id === params.id && x.user_id === actor.user.id);
      if (!n) return fail('Target database resource not found.', 404);
      n.read_at ??= nowIso();
      return json({ status: 'success' });
    }),
  ),

  http.post(
    api('/notifications/read-all'),
    authed('any', ({ actor }) => {
      db.t.notifications.filter((n) => n.user_id === actor.user.id && !n.read_at).forEach((n) => (n.read_at = nowIso()));
      return json({ status: 'success' });
    }),
  ),
];
