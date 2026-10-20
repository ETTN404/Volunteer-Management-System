/**
 * PENDING-BE handlers: public, password, account & notifications.
 * Each handler is tagged with its gap id (G#) from docs/PENDING_BACKEND_CONTRACTS.md.
 * Delete a handler once Laravel ships the endpoint.
 */
import { http } from 'msw';
import { db, find, nowIso, res } from '../../db';
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

  // Shareable organization page (no login)
  http.get(api('/public/organizations/:id'), async ({ params }) => {
    await latency();
    const o = db.t.organizations.find((x) => x.id === Number(params.id) && x.status === 'active');
    if (!o) return fail('Target database resource not found.', 404);
    const events = db.t.events.filter((e) => e.org_id === o.id);
    const shiftIds = new Set(db.t.shifts.filter((s) => events.some((e) => e.id === s.event_id)).map((s) => s.id));
    const now = nowIso();
    const upcoming = events
      .filter((e) => (e.status === 'upcoming' || e.status === 'ongoing') && e.end_date >= now.slice(0, 10))
      .map((e) => {
        const shifts = db.t.shifts.filter((s) => s.event_id === e.id && s.start_time > now).sort((a, b) => a.start_time.localeCompare(b.start_time));
        const open = shifts.reduce((n, s) => n + Math.max(0, s.capacity - db.t.assignments.filter((a) => a.shift_id === s.id && a.status === 'confirmed').length), 0);
        return { id: e.id, title: e.title, description: e.description ?? '', location: e.location, start_date: e.start_date, end_date: e.end_date, next_shift: shifts[0]?.start_time ?? null, shifts: shifts.length, open_places: open };
      });
    return ok({
      id: o.id,
      name: o.name,
      logo_url: o.logo_path,
      primary_color: (o as { primary_color?: string | null }).primary_color ?? null,
      website: o.website ?? null,
      city: (o as { city?: string | null }).city ?? null,
      country: (o as { country?: string | null }).country ?? 'ET',
      about: (o as { about?: string | null }).about ?? null,
      verified: true,
      member_since: o.created_at.slice(0, 10),
      stats: {
        active_events: upcoming.length,
        past_events: events.filter((e) => e.status === 'completed').length,
        volunteers: new Set(db.t.assignments.filter((a) => shiftIds.has(a.shift_id) && a.status === 'confirmed').map((a) => a.volunteer_id)).size,
        verified_hours: Math.round(db.t.attendances.filter((a) => shiftIds.has(a.shift_id)).reduce((n, a) => n + (a.verified_hours ?? 0), 0) * 10) / 10,
      },
      upcoming_events: upcoming,
    });
  }),

  // Account details & alert preferences
  http.patch(
    api('/account'),
    authed('any', async ({ request, actor }) => {
      const b = await body(request);
      if (b.sms_opt_in && !(b.phone ?? actor.user.phone)) {
        return json({ message: 'Add your phone number first.', errors: { phone: ['Add your phone number to receive SMS alerts.'] } }, 422);
      }
      if (typeof b.phone === 'string' || b.phone === null) actor.user.phone = (b.phone as string | null) || null;
      if (typeof b.sms_opt_in === 'boolean') actor.user.sms_opt_in = b.sms_opt_in;
      if (b.locale === 'en' || b.locale === 'am') actor.user.locale = b.locale;
      if (typeof b.first_name === 'string' || typeof b.last_name === 'string') {
        const [f, ...l] = actor.user.full_name.split(' ');
        actor.user.full_name = `${(b.first_name as string) ?? f} ${(b.last_name as string) ?? l.join(' ')}`.trim();
      }
      return ok(res.user(actor.user, { volunteer: true, organization: true }), 'Account updated.');
    }),
  ),

  // Telegram alerts: deep link (the mock links straight away so the UI can be tried)
  http.post(
    api('/account/telegram'),
    authed('any', ({ actor }) => {
      actor.user.telegram_chat_id = `mock-${actor.user.id}`;
      return ok({ url: 'https://t.me/VolunTrackBot?start=mock' });
    }),
  ),
  http.delete(
    api('/account/telegram'),
    authed('any', ({ actor }) => {
      actor.user.telegram_chat_id = null;
      return json({ status: 'success', message: 'Telegram disconnected.' });
    }),
  ),

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
