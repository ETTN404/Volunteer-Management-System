import { delay, HttpResponse } from 'msw';
import { env } from '@/shared/config/env';
import type { Role } from '@/shared/types/api';
import { db, find, persist } from '../db';
import type { UserRow, VolunteerRow } from '../db/schema';

export const API = env.apiUrl;
export const api = (path: string) => `${API}${path}`;
/** Origin used for download_url fields (Laravel's url()). */
export const ORIGIN = API.replace(/\/api$/, '');

export const json = (body: unknown, status = 200) => HttpResponse.json(body as Record<string, unknown>, { status });
export const ok = (data: unknown, message?: string, status = 200, extra: Record<string, unknown> = {}) =>
  json({ status: 'success', ...(message ? { message } : {}), data, ...extra }, status);
export const fail = (message: string, status = 422, extra: Record<string, unknown> = {}) =>
  json({ status: 'error', message, ...extra }, status);
export const notFound = () => fail('Target database resource not found.', 404);

export async function latency() {
  if (env.isTest) return;
  await delay(120 + Math.random() * 380);
}

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

/* ---------------- Auth ---------------- */

export interface Actor {
  user: UserRow;
  volunteer?: VolunteerRow;
}

/**
 * In `pending` mode the real Laravel API owns the session, so the token is unknown to the mock DB.
 * We then trust the session user cached by the auth store and keep a shadow copy in the mock DB,
 * so pending features (documents, notifications, …) can attach data to the real user id.
 */
function shadowActorFromSession(): Actor | null {
  try {
    const raw = localStorage.getItem('vt-session');
    const user = raw ? (JSON.parse(raw).state?.user as Partial<UserRow> & { volunteer?: Partial<VolunteerRow> }) : null;
    if (!user?.id || !user.role) return null;
    let row = find.user(user.id);
    if (!row) {
      row = {
        id: user.id,
        org_id: user.org_id ?? null,
        full_name: user.full_name ?? 'User',
        email: user.email ?? `user${user.id}@example.com`,
        password: '',
        role: user.role,
        is_active: true,
        profile_photo_path: null,
        last_login: null,
        created_at: new Date().toISOString(),
      };
      db.t.users.push(row);
    }
    let volunteer = find.volunteerByUser(row.id);
    if (!volunteer && row.role === 'Volunteer' && user.volunteer?.id) {
      volunteer = {
        id: user.volunteer.id,
        user_id: row.id,
        skills: (user.volunteer.skills as string[]) ?? [],
        availability: user.volunteer.availability ?? [],
        total_hours: Number(user.volunteer.total_hours ?? 0),
        impact_score: Number(user.volunteer.impact_score ?? 0),
        bio: user.volunteer.bio ?? null,
        date_of_birth: null,
        parental_consent_verified: false,
        skills_verification: {},
        created_at: new Date().toISOString(),
      };
      db.t.volunteers.push(volunteer);
    }
    persist();
    return { user: row, volunteer };
  } catch {
    return null;
  }
}

export function resolveActor(request: Request): Actor | null {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  const userId = token ? db.t.tokens[token] : undefined;
  if (userId) {
    const user = find.user(userId);
    if (user) return { user, volunteer: find.volunteerByUser(user.id) };
  }
  if (env.mockMode === 'pending' && token && typeof localStorage !== 'undefined') return shadowActorFromSession();
  return null;
}

type Ctx = { request: Request; params: Record<string, string | readonly string[] | undefined> };
type AuthedCtx = Ctx & { actor: Actor; url: URL };

/**
 * Mirrors the Laravel middleware stack: auth:sanctum → TenantMiddleware (suspended org) → role:X.
 */
export function authed(roles: Role[] | 'any', handler: (ctx: AuthedCtx) => Response | Promise<Response>) {
  return async (ctx: Ctx) => {
    await latency();
    const actor = resolveActor(ctx.request);
    if (!actor) return fail('Unauthenticated. Please provide a valid Sanctum bearer token.', 401);

    const org = find.org(actor.user.org_id);
    if (org && org.status === 'suspended') {
      for (const [t, id] of Object.entries(db.t.tokens)) if (id === actor.user.id) delete db.t.tokens[t];
      persist();
      return json(
        {
          error: 'Organization Suspended',
          message: 'Your organization account has been suspended. Please contact the platform administrator.',
        },
        403,
      );
    }

    if (roles !== 'any' && !roles.includes(actor.user.role)) {
      return json({ error: 'Unauthorized.', message: `Action requires one of the following roles: ${roles.join(', ')}` }, 403);
    }
    if (roles !== 'any' && roles.length === 1 && roles[0] === 'Volunteer' && !actor.volunteer) {
      return fail('Volunteer profile not found.', 404);
    }
    const response = await handler({ ...ctx, actor, url: new URL(ctx.request.url) });
    persist();
    return response;
  };
}

export const param = (ctx: Ctx, name: string) => Number(ctx.params[name]);

/* ---------------- Laravel-style validation ---------------- */

type Rule =
  | { required?: boolean; type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'email' | 'url' | 'date'; min?: number; max?: number; in?: readonly (string | number)[]; nullable?: boolean; sometimes?: boolean; custom?: (v: unknown, all: Record<string, unknown>) => string | null };

export type Rules = Record<string, Rule>;

const label = (field: string) => field.replace(/_/g, ' ');

export function validate(input: Record<string, unknown>, rules: Rules): Response | null {
  const errors: Record<string, string[]> = {};
  const add = (f: string, m: string) => (errors[f] ??= []).push(m);

  for (const [field, rule] of Object.entries(rules)) {
    const v = input[field];
    const present = v !== undefined && v !== null && v !== '';
    if (rule.sometimes && v === undefined) continue;
    if (!present) {
      if (rule.required) add(field, `The ${label(field)} field is required.`);
      continue;
    }
    switch (rule.type) {
      case 'string':
        if (typeof v !== 'string') add(field, `The ${label(field)} field must be a string.`);
        else {
          if (rule.max != null && v.length > rule.max) add(field, `The ${label(field)} field must not be greater than ${rule.max} characters.`);
          if (rule.min != null && v.length < rule.min) add(field, `The ${label(field)} field must be at least ${rule.min} characters.`);
        }
        break;
      case 'email':
        if (typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) add(field, `The ${label(field)} field must be a valid email address.`);
        else if (rule.max != null && v.length > rule.max) add(field, `The ${label(field)} field must not be greater than ${rule.max} characters.`);
        break;
      case 'url':
        if (typeof v !== 'string' || !/^https?:\/\/.+\..+/.test(v)) add(field, `The ${label(field)} field must be a valid URL.`);
        break;
      case 'number':
      case 'integer': {
        const n = Number(v);
        if (Number.isNaN(n) || (rule.type === 'integer' && !Number.isInteger(n))) add(field, `The ${label(field)} field must be ${rule.type === 'integer' ? 'an integer' : 'a number'}.`);
        else {
          if (rule.min != null && n < rule.min) add(field, `The ${label(field)} field must be at least ${rule.min}.`);
          if (rule.max != null && n > rule.max) add(field, `The ${label(field)} field must not be greater than ${rule.max}.`);
        }
        break;
      }
      case 'array':
        if (!Array.isArray(v)) add(field, `The ${label(field)} field must be an array.`);
        break;
      case 'boolean':
        if (typeof v !== 'boolean') add(field, `The ${label(field)} field must be true or false.`);
        break;
      case 'date':
        if (typeof v !== 'string' || Number.isNaN(new Date(v.replace(' ', 'T')).getTime())) add(field, `The ${label(field)} field must be a valid date.`);
        break;
    }
    if (rule.in && !rule.in.includes(v as string)) add(field, `The selected ${label(field)} is invalid.`);
    if (rule.custom && !errors[field]) {
      const m = rule.custom(v, input);
      if (m) add(field, m);
    }
  }

  const fields = Object.keys(errors);
  if (fields.length === 0) return null;
  const first = errors[fields[0]!]![0]!;
  const more = fields.reduce((n, f) => n + errors[f]!.length, 0) - 1;
  return json({ message: more > 0 ? `${first} (and ${more} more error${more > 1 ? 's' : ''})` : first, errors }, 422);
}

export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function issueToken(userId: number): string {
  const token = `${userId}|mock_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  db.t.tokens[token] = userId;
  persist(true);
  return token;
}
