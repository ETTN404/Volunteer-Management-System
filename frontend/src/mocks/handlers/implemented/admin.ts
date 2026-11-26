import { billingSnapshot } from './business';
import { http } from 'msw';
import { db, find, nextId, nowIso, paginate, res, audit } from '../../db';
import { api, authed, body, fail, json, ok, param, validate } from '../utils';
import { profilePayload } from './volunteer';

/** OrgAdminController + SuperAdminController + TenantOnboardingController. */
export const adminHandlers = [
  /* ---------------- Org admin ---------------- */
  http.get(
    api('/admin/organization'),
    authed(['OrgAdmin'], ({ actor }) =>
      ok({
        ...res.org(find.org(actor.user.org_id)!),
        verification_status: 'verified',
        billing: billingSnapshot(actor.user.org_id),
        settings: { attendance: { checkin_before_minutes: 15, checkin_after_minutes: 30, qr_window_seconds: 30, early_checkout_minutes: 15, undo_checkout_minutes: 10, auto_checkout_grace: 30, max_gps_accuracy: 150, ping_interval_minutes: 5, require_qr: true, auto_verify_hours: false } },
      }),
    ),
  ),

  http.patch(
    api('/admin/organization'),
    authed(['OrgAdmin'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        name: { sometimes: true, type: 'string', max: 150 },
        address: { sometimes: true, type: 'string', max: 255 },
        phone: { sometimes: true, type: 'string', max: 50, nullable: true },
        website: { sometimes: true, type: 'url', nullable: true },
      });
      if (invalid) return invalid;
      const org = find.org(actor.user.org_id)!;
      const old = { name: org.name, address: org.address, phone: org.phone, website: org.website };
      for (const k of ['name', 'address', 'phone', 'website'] as const) if (k in b) (org as unknown as Record<string, unknown>)[k] = b[k] ?? null;
      // PENDING-BE G20 branding fields
      for (const k of ['primary_color', 'subdomain'] as const) if (k in b) (org as unknown as Record<string, unknown>)[k] = b[k] ?? null;
      audit('organization.updated', actor.user, { type: 'Organization', id: org.id }, old, { name: org.name, address: org.address, phone: org.phone, website: org.website });
      return ok(res.org(org), 'Organization settings updated successfully.');
    }),
  ),

  http.post(
    api('/admin/coordinators'),
    authed(['OrgAdmin'], async ({ request, actor }) => {
      const b = await body(request);
      const invalid = validate(b, {
        first_name: { required: true, type: 'string', max: 60 },
        last_name: { required: true, type: 'string', max: 60 },
        email: { required: true, type: 'email', max: 100, custom: (v) => (find.userByEmail(String(v)) ? 'The email has already been taken.' : null) },
        password: { required: true, type: 'string', min: 8, custom: (v) => (v === b.password_confirmation ? null : 'The two passwords do not match.') },
      });
      if (invalid) return invalid;
      const row = { id: nextId(db.t.users), org_id: actor.user.org_id, full_name: `${b.first_name} ${b.last_name}`, email: String(b.email), password: String(b.password), role: 'Coordinator' as const, is_active: true, profile_photo_path: null, last_login: null, created_at: nowIso() };
      db.t.users.push(row);
      audit('user.coordinator_created', actor.user, { type: 'User', id: row.id }, null, { full_name: row.full_name, email: row.email });
      return ok(res.user(row), `${row.full_name} can sign in now with ${row.email} and the password you set.`, 201);
    }),
  ),

  http.get(
    api('/admin/members'),
    authed(['OrgAdmin'], ({ actor, url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      const members = db.t.users
        .filter((u) => u.org_id === actor.user.org_id && u.role !== 'OrgAdmin')
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { items, pagination } = paginate(members, page, 20);
      return ok(items.map((u) => ({ ...res.user(u, { volunteer: true }), relationship: 'member', invitation_pending: u.password === 'invited' })), undefined, 200, { pagination });
    }),
  ),

  http.patch(
    api('/admin/volunteers/:userId/status'),
    authed(['OrgAdmin'], (ctx) => {
      const u = db.t.users.find((x) => x.id === param(ctx, 'userId') && x.org_id === ctx.actor.user.org_id && x.role === 'Volunteer');
      if (!u) return fail('Target database resource not found.', 404);
      u.is_active = !u.is_active;
      audit(u.is_active ? 'volunteer.reactivated' : 'volunteer.deactivated', ctx.actor.user, { type: 'User', id: u.id });
      return json({ status: 'success', message: u.is_active ? 'Volunteer account reactivated.' : 'Volunteer account deactivated.', is_active: u.is_active });
    }),
  ),

  http.get(
    api('/admin/volunteers/:volunteerId'),
    authed(['OrgAdmin'], (ctx) => {
      const v = find.volunteer(param(ctx, 'volunteerId'));
      if (!v || find.user(v.user_id)?.org_id !== ctx.actor.user.org_id) return fail('Target database resource not found.', 404);
      return ok(profilePayload(v.id));
    }),
  ),

  /* ---------------- Super admin ---------------- */
  http.get(
    api('/superadmin/dashboard'),
    authed(['SuperAdmin'], () =>
      ok({
        total_organizations: db.t.organizations.length,
        active_organizations: db.t.organizations.filter((o) => o.status === 'active').length,
        total_users: db.t.users.length,
        total_volunteers: db.t.users.filter((u) => u.role === 'Volunteer').length,
        total_coordinators: db.t.users.filter((u) => u.role === 'Coordinator').length,
      }),
    ),
  ),

  http.post(
    api('/superadmin/onboard-tenant'),
    authed(['SuperAdmin'], async ({ request, actor }) => {
      const ct = request.headers.get('content-type') ?? '';
      const b: Record<string, unknown> = ct.includes('multipart') ? Object.fromEntries([...(await request.formData()).entries()].filter(([, v]) => typeof v === 'string')) : await body(request);
      const invalid = validate(b, {
        org_name: { required: true, type: 'string', max: 150 },
        org_email: { required: true, type: 'email', max: 100, custom: (v) => (db.t.organizations.some((o) => o.email === v) ? 'An organization with this email is already on VolunTrack.' : null) },
        org_country: { required: true, type: 'string' },
        org_city: { required: true, type: 'string', max: 100 },
        org_phone: { required: true, type: 'string', custom: (v) => (/^\+[1-9]\d{6,14}$/.test(String(v)) ? null : 'Enter a valid phone number for the selected country.') },
        org_website: { type: 'url', nullable: true },
        admin_first_name: { required: true, type: 'string', max: 60 },
        admin_last_name: { required: true, type: 'string', max: 60 },
        admin_email: { required: true, type: 'email', max: 100, custom: (v) => (find.userByEmail(String(v)) ? 'This email already has a VolunTrack account.' : null) },
        admin_password: { required: true, type: 'string', min: 8, custom: (v) => (v === b.admin_password_confirmation ? null : 'The two passwords do not match.') },
      });
      if (invalid) return invalid;
      const org = { id: nextId(db.t.organizations), name: String(b.org_name), email: String(b.org_email), address: `${b.org_city}, ${b.org_country}`, phone: String(b.org_phone), website: (b.org_website as string) ?? null, logo_path: null, status: 'active' as const, subscription_plan: String(b.plan ?? 'free'), primary_color: null, subdomain: null, created_at: nowIso() };
      db.t.organizations.push(org);
      const admin = { id: nextId(db.t.users), org_id: org.id, full_name: `${b.admin_first_name} ${b.admin_last_name}`, email: String(b.admin_email), password: String(b.admin_password), role: 'OrgAdmin' as const, is_active: true, profile_photo_path: null, last_login: null, created_at: nowIso() };
      db.t.users.push(admin);
      audit('tenant.onboarded', actor.user, { type: 'Organization', id: org.id }, null, { org_name: org.name, plan: org.subscription_plan });
      return ok({ organization: res.org(org), admin: res.user(admin) }, `Organization onboarded. ${admin.email} can sign in now with the password you set.`, 201);
    }),
  ),

  http.get(
    api('/superadmin/organizations'),
    authed(['SuperAdmin'], ({ url }) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      const orgs = [...db.t.organizations].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { items, pagination } = paginate(orgs, page, 15);
      return ok(items.map((o) => res.org(o)), undefined, 200, { pagination });
    }),
  ),

  http.get(
    api('/superadmin/organizations/:id'),
    authed(['SuperAdmin'], (ctx) => {
      const o = find.org(param(ctx, 'id'));
      if (!o) return fail('Target database resource not found.', 404);
      return ok({ organization: res.org(o), user_count: db.t.users.filter((u) => u.org_id === o.id).length, event_count: db.t.events.filter((e) => e.org_id === o.id).length });
    }),
  ),

  http.patch(
    api('/superadmin/organizations/:id/status'),
    authed(['SuperAdmin'], async (ctx) => {
      const o = find.org(param(ctx, 'id'));
      if (!o) return fail('Target database resource not found.', 404);
      const b = await body(ctx.request);
      const invalid = validate(b, { status: { sometimes: true, in: ['active', 'suspended', 'inactive'] }, subscription_plan: { sometimes: true, type: 'string', max: 50 } });
      if (invalid) return invalid;
      const old = { status: o.status, subscription_plan: o.subscription_plan, org_name: o.name };
      if (b.status) o.status = b.status as typeof o.status;
      if (b.subscription_plan) o.subscription_plan = String(b.subscription_plan);
      audit('tenant.status_updated', ctx.actor.user, { type: 'Organization', id: o.id }, old, { status: o.status, subscription_plan: o.subscription_plan, org_name: o.name });
      return ok(res.org(o), 'Organization status updated successfully.');
    }),
  ),

  http.get(
    api('/superadmin/audit-logs'),
    authed(['SuperAdmin'], () => ok([...db.t.audit].sort((a, b) => b.id - a.id).slice(0, 100).map((l) => ({ ...l, created_at: l.created_at.slice(0, 19).replace('T', ' ') })))),
  ),
];
