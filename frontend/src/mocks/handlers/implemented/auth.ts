import { http } from 'msw';
import { db, find, nextId, nowIso, persist, res } from '../../db';
import { api, authed, body, fail, issueToken, json, latency, ORIGIN, validate } from '../utils';

/** AuthController + public certificate verification + GET /user. */
export const authHandlers = [
  http.post(api('/register'), async ({ request }) => {
    await latency();
    const b = await body(request);
    const invalid = validate(b, {
      org_id: { type: 'integer', nullable: true, custom: (v) => (find.org(Number(v)) ? null : 'The selected org id is invalid.') },
      full_name: { required: true, type: 'string', max: 100 },
      email: { required: true, type: 'email', max: 100, custom: (v) => (find.userByEmail(String(v)) ? 'The email has already been taken.' : null) },
      password: { required: true, type: 'string', min: 8 },
      skills: { type: 'array' },
      availability: { type: 'array' },
      bio: { type: 'string', max: 1000, nullable: true },
    });
    if (invalid) return invalid;

    const user = {
      id: nextId(db.t.users),
      org_id: b.org_id ? Number(b.org_id) : null,
      full_name: String(b.full_name).trim(),
      email: String(b.email).trim().toLowerCase(),
      password: String(b.password),
      role: 'Volunteer' as const,
      is_active: true,
      profile_photo_path: null,
      last_login: null,
      created_at: nowIso(),
    };
    db.t.users.push(user);
    db.t.volunteers.push({
      id: nextId(db.t.volunteers),
      user_id: user.id,
      skills: (b.skills as string[]) ?? [],
      availability: (b.availability as string[]) ?? [],
      total_hours: 0,
      impact_score: 0,
      bio: (b.bio as string) ?? null,
      date_of_birth: (b.date_of_birth as string) ?? null,
      parental_consent_verified: false,
      skills_verification: {},
      created_at: nowIso(),
    });
    const token = issueToken(user.id);
    persist();
    return json(
      {
        status: 'success',
        message: 'Volunteer registered successfully.',
        access_token: token,
        token_type: 'Bearer',
        user: res.user(user, { volunteer: true }),
      },
      201,
    );
  }),

  http.post(api('/login'), async ({ request }) => {
    await latency();
    const b = await body<{ email?: string; password?: string }>(request);
    const invalid = validate(b, { email: { required: true, type: 'string' }, password: { required: true, type: 'string' } });
    if (invalid) return invalid;
    const input = b.email!.trim();
    const user = db.t.users.find((u) => u.email.toLowerCase() === input.toLowerCase() || u.full_name === input);
    if (!user || user.password !== b.password) {
      return json(
        {
          message: 'Invalid login credentials. Please check your email/username and password.',
          errors: { email: ['Invalid login credentials. Please check your email/username and password.'] },
        },
        422,
      );
    }
    user.last_login = nowIso();
    const token = issueToken(user.id);
    return json({
      status: 'success',
      message: 'Login successful.',
      access_token: token,
      token_type: 'Bearer',
      role: user.role,
      user: res.user(user, { volunteer: true }),
    });
  }),

  http.post(
    api('/logout'),
    authed('any', ({ request }) => {
      const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      delete db.t.tokens[token];
      return json({ status: 'success', message: 'Session logged out successfully.' });
    }),
  ),

  http.get(
    api('/user'),
    // Route closure returns `new UserResource(...)` → wrapped in { data }.
    authed('any', ({ actor }) => json({ data: res.user(actor.user, { volunteer: true, organization: true }) })),
  ),

  http.get(api('/verify/certificate/:number'), async ({ params }) => {
    await latency();
    const number = String(params.number);
    const idFromNumber = Number(number.replace(/^VMS-/i, ''));
    const cert = db.t.certificates.find((c) => c.file_path.includes(number) || c.id === idFromNumber);
    if (!cert) return json({ status: 'error', valid: false, message: 'Invalid or unverified certificate number.' }, 404);
    const v = find.volunteer(cert.volunteer_id);
    const name = (v && find.user(v.user_id)?.full_name) || 'Verified Volunteer';
    const parts = name.split(' ');
    const masked = parts[0] + (parts[1] ? ` ${parts[1][0]!.toUpperCase()}.` : '');
    return json({
      status: 'success',
      valid: true,
      data: {
        certificate_number: number,
        volunteer_name: masked,
        organization_name: find.org(cert.org_id)?.name ?? 'VolunTrack Platform',
        milestone_hours: cert.milestone_hours,
        issued_date: `${cert.issued_date}T00:00:00.000000Z`,
        verified_at: new Date().toISOString(),
      },
    });
  }),

  // Static file stand-ins for download_url values.
  http.get(`${ORIGIN}/storage/*`, async () => {
    await latency();
    return fail('Certificate file does not exist on disk.', 404);
  }),
];
