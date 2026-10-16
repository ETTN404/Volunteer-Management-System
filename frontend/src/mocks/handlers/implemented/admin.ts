import { http } from 'msw';
import { db, find, nextId, nowIso, paginate, res, audit } from '../../db';
import { api, authed, body, fail, json, ok, param, validate } from '../utils';
import { profilePayload } from './volunteer';

/** OrgAdminController + SuperAdminController + TenantOnboardingController. */
export const adminHandlers = [
  /* ---------------- Org admin ---------------- */
  http.get(
    api('/admin/organization'),
    authed(['OrgAdmin'], ({ actor }) => ok(res.org(find.org(actor.user.org_id)!))),
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
        full_name: { required: true, type: 'string', max: 100 },
        email: { required: true, type: 'email', max: 100, custom: (v) => (find.userByEmail(String(v)) ? 'The email has already been taken.' : null) },
        password: { required: true, type: 'string', min: 8 },
      });
      if (invalid) return invalid;
      const row = { id: nextId(db.t.users), org_id: actor.user.org_id, full_name: String(b.full_name), email: String(b.email), password: String(b.password), role: 'Coordinator' as const, is_active: true, profile_photo_path: null, last_login: null, created_at: nowIso() };
      db.t.users.push(row);
      audit('user.coordinator_created', actor.user, { type: 'User', id: row.id });
      return ok(res.user(row), 'Coordinator account created successfully.', 201);
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
      return ok(items.map((u) => res.user(u, { volunteer: true })), undefined, 200, { pagination });
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
      const b = await body(request);
      const invalid = validate(b, {
        org_name: { required: true, type: 'string', max: 150 },
        org_email: { required: true, type: 'email', max: 100, custom: (v) => (db.t.organizations.some((o) => o.email === v) ? 'The org email has already been taken.' : null) },
        org_address: { required: true, type: 'string', max: 255 },
        org_phone: { type: 'string', max: 50, nullable: true },
        org_website: { type: 'url', nullable: true },
        admin_full_name: { required: true, type: 'string', max: 100 },
        admin_email: { required: true, type: 'email', max: 100, custom: (v) => (find.userByEmail(String(v)) ? 'The admin email has already been taken.' : null) },
        admin_password: { required: true, type: 'string', min: 8 },
      });
      if (invalid) return invalid;
      const org = { id: nextId(db.t.organizations), name: String(b.org_name), email: String(b.org_email), address: String(b.org_address), phone: (b.org_phone as string) ?? null, website: (b.org_website as string) ?? null, logo_path: null, status: 'active' as const, subscription_plan: 'free', primary_color: null, subdomain: null, created_at: nowIso() };
      db.t.organizations.push(org);
      const admin = { id: nextId(db.t.users), org_id: org.id, full_name: String(b.admin_full_name), email: String(b.admin_email), password: String(b.admin_password), role: 'OrgAdmin' as const, is_active: true, profile_photo_path: null, last_login: null, created_at: nowIso() };
      db.t.users.push(admin);
      audit('tenant.onboarded', actor.user, { type: 'Organization', id: org.id }, null, { name: org.name, plan: org.subscription_plan });
      return ok({ organization: res.org(org), admin: res.user(admin) }, 'Organization tenant onboarding completed successfully.', 201);
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
