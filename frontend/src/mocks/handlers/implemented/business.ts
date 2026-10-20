/**
 * Offline mirrors of billing, verification documents, messaging, payments, reports
 * on organizations and health (OrgAdminController / SuperAdminController / SupportController).
 */
import { http, passthrough } from 'msw';
import { env } from '@/shared/config/env';
import { db, find, res } from '../../db';
import { api, authed, json, ok } from '../utils';

const PLANS = [
  { key: 'free', name: 'Free', price_monthly: 0, limits: { coordinators: 2, active_events: 3, shifts_per_event: 10, volunteers: 150, broadcasts_per_month: 5, storage_mb: 100 }, features: [] },
  { key: 'pro', name: 'Pro', price_monthly: 1500, limits: { coordinators: 15, active_events: 50, shifts_per_event: 100, volunteers: 3000, broadcasts_per_month: 100, storage_mb: 5000 }, features: ['branding', 'reports_export', 'analytics', 'audit_log', 'ai_screening'] },
  { key: 'enterprise', name: 'Enterprise', price_monthly: 5000, limits: { coordinators: null, active_events: null, shifts_per_event: null, volunteers: null, broadcasts_per_month: null, storage_mb: null }, features: ['branding', 'reports_export', 'analytics', 'audit_log', 'ai_screening', 'subdomain', 'priority_support'] },
];

export function billingSnapshot(orgId: number | null) {
  const org = find.org(orgId);
  const plan = PLANS.find((p) => p.key === (org?.subscription_plan ?? 'free')) ?? PLANS[0]!;
  const coordinators = db.t.users.filter((u) => u.org_id === orgId && u.role === 'Coordinator').length;
  const active = db.t.events.filter((e) => e.org_id === orgId && (e.status === 'upcoming' || e.status === 'ongoing')).length;
  const vols = db.t.users.filter((u) => u.org_id === orgId && u.role === 'Volunteer').length;
  const used: Record<string, number> = { coordinators, active_events: active, shifts_per_event: 0, volunteers: vols, broadcasts_per_month: 0, storage_mb: 0 };
  return {
    plan: plan.key,
    plan_name: plan.name,
    subscribed_plan: plan.key,
    plan_expires_at: null,
    features: plan.features,
    limits: Object.fromEntries(Object.entries(plan.limits).map(([k, v]) => [k, { used: used[k] ?? 0, limit: v }])),
  };
}

export const businessHandlers = [
  // Static geo files (public/geo) — tiny fixtures offline.
  http.get('*/geo/countries.json', () =>
    !env.isTest ? passthrough() : json([
      { iso: 'ET', name: 'Ethiopia', phone: '251' },
      { iso: 'KE', name: 'Kenya', phone: '254' },
    ] as never),
  ),
  http.get('*/geo/cities/:file', () =>
    !env.isTest ? passthrough() : json([
      { name: 'Addis Ababa', region: 'Addis Ababa' },
      { name: 'Hawassa', region: 'Sidama' },
    ] as never),
  ),
  http.get(api('/public/plans'), () => ok(PLANS)),

  http.get(
    api('/admin/billing'),
    authed(['OrgAdmin'], ({ actor }) =>
      ok({
        ...billingSnapshot(actor.user.org_id),
        catalog: PLANS,
        payment_methods: [
          { key: 'telebirr', name: 'telebirr', account: '0911000000', needs_suffix: false, reference_hint: 'Transaction number' },
          { key: 'cbe', name: 'Commercial Bank of Ethiopia', account: '1000000000000', needs_suffix: false, reference_hint: 'FT reference' },
        ],
        account_name: 'VolunTrack PLC',
        currency: 'ETB',
        auto_verification: true,
        payments: [],
      }),
    ),
  ),
  http.post(
    api('/admin/billing/payments'),
    authed(['OrgAdmin'], () => json({ status: 'success', message: 'Payment received. We will confirm it shortly.', data: { id: 1, status: 'pending', plan: 'pro', months: 1, amount: 1500, currency: 'ETB', method: 'telebirr', transaction_ref: 'DEMO', created_at: new Date().toISOString() } }, 201)),
  ),
  http.get(api('/admin/organization/documents'), authed(['OrgAdmin'], () => ok([]))),
  http.get(api('/admin/threads'), authed(['OrgAdmin'], () => json({ status: 'success', data: [], unread_count: 0 }))),
  http.get(api('/superadmin/threads'), authed(['SuperAdmin'], () => json({ status: 'success', data: [], unread_count: 0 }))),
  http.get(api('/superadmin/payments'), authed(['SuperAdmin'], () => ok([], undefined, 200, { pagination: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }))),
  http.get(
    api('/superadmin/payments/summary'),
    authed(['SuperAdmin'], () =>
      ok({ total_revenue: 0, revenue_this_month: 0, mrr: 0, paying_organizations: 0, pending_count: 0, pending_amount: 0, rejected_count: 0, auto_verified_share: null, by_method: [], by_plan: [], months: [], expiring_soon: [] }),
    ),
  ),
  http.get(api('/superadmin/reports'), authed(['SuperAdmin'], () => ok([], undefined, 200, { pagination: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }))),
  http.get(
    api('/superadmin/health'),
    authed(['SuperAdmin'], () =>
      ok({ ok: true, checks: { database: { ok: true, driver: 'mock', latency_ms: 1 } }, app: { env: 'mock', debug: false, php: '—', laravel: '—', time: new Date().toISOString() } }),
    ),
  ),
  http.patch(
    api('/superadmin/organizations/:id/verification'),
    authed(['SuperAdmin'], (ctx) => {
      const org = find.org(Number(ctx.params.id));
      return org ? ok(res.org(org)) : json({ status: 'error', message: 'Target database resource not found.' }, 404);
    }),
  ),
];
