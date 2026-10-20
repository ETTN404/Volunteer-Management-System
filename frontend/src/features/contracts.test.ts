/**
 * Contract tests: exercise every feature API module against the mock backend, which mirrors
 * Laravel's validation and business rules. Phase 13 re-runs these against the live API.
 */
import { describe, expect, it } from 'vitest';
import { authApi } from './auth/api';
import { volunteerApi } from './volunteer/api';
import { opsApi } from './operations/api';
import { peopleApi } from './people/api';
import { orgApi } from './organization/api';
import { platformApi } from './platform/api';
import { publicApi } from './public/api';
import { documentsApi } from './documents/api';
import { notificationsApi } from './notifications/api';
import { chatApi } from './chat/api';
import { announcementsApi } from './announcements/api';
import { DEMO, signInAs } from '@/test/auth';
import { DEMO_QR_SIGNATURE } from '@/mocks/db/seed';
import { db } from '@/mocks/db';
import { offsetMeters } from '@/shared/lib/geo';
import { toApiDateTime, toApiDate } from '@/shared/lib/time';

const MESKEL = { latitude: 9.010733, longitude: 38.761269 };
const liveShiftId = () => db.t.shifts.find((s) => s.qr_code_signature === DEMO_QR_SIGNATURE)!.id;

describe('auth', () => {
  it('logs in by email or full name and rejects bad passwords', async () => {
    const a = await authApi.login(DEMO.volunteer, 'password');
    expect(a.user.role).toBe('Volunteer');
    expect(a.access_token).toMatch(/\|/);
    const b = await authApi.login('Red Cross Coordinator', 'password');
    expect(b.user.email).toBe(DEMO.coordinator);
    await expect(authApi.login(DEMO.volunteer, 'nope')).rejects.toMatchObject({ status: 422 });
  });

  it('registers a volunteer and validates uniqueness', async () => {
    const r = await authApi.register({ first_name: 'New', last_name: 'Person', email: 'new@person.et', password: 'longenough', org_id: 1, skills: ['first_aid'] });
    expect(r.user.volunteer?.skills).toEqual(['first_aid']);
    await expect(authApi.register({ first_name: 'Dup', last_name: 'Licate', email: DEMO.volunteer, password: 'longenough' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { email: ['The email has already been taken.'] },
    });
  });

  it('returns the current user with organization', async () => {
    await signInAs(DEMO.coordinator);
    const me = await authApi.me();
    expect(me.organization?.name).toBe('Red Cross Ethiopia');
  });

  it('blocks members of suspended organizations', async () => {
    await signInAs('admin@lalibelayouth.org');
    await expect(authApi.me()).rejects.toMatchObject({ status: 403 });
  });
});

describe('volunteer portal', () => {
  it('reads profile, impact and match-scored opportunities', async () => {
    await signInAs(DEMO.volunteer);
    const p = await volunteerApi.profile();
    expect(p.reliability.attendance_rate).toBeGreaterThan(0);
    const impact = await volunteerApi.impact();
    expect(impact.next_milestone).toBe(50);
    const events = await volunteerApi.events();
    expect(events.items.length).toBeGreaterThan(0);
    expect(events.items.every((e) => e.org_id === 1)).toBe(true);
    expect(events.items[0]!.shifts![0]!.match_score).toBeTypeOf('number');
  });

  it('applies, detects conflicts, and withdraws', async () => {
    await signInAs(DEMO.volunteer);
    const free = db.t.shifts.find((s) => s.event_id === 3 && !db.t.assignments.some((a) => a.shift_id === s.id && a.volunteer_id === 1))!;
    const a = await volunteerApi.apply(free.id);
    expect(a.status).toBe('pending');
    await expect(volunteerApi.apply(free.id)).rejects.toMatchObject({ message: 'You have already applied for this shift.' });
    await volunteerApi.withdraw(a.id);
    const schedule = await volunteerApi.schedule();
    expect(schedule.some((x) => x.id === a.id)).toBe(false);
  });

  it('enforces every check-in gate', async () => {
    await signInAs(DEMO.volunteer);
    const base = { shift_id: liveShiftId(), qr_code_signature: DEMO_QR_SIGNATURE, ...MESKEL, client_timestamp: new Date().toISOString() };
    await expect(volunteerApi.checkIn({ ...base, client_timestamp: new Date(Date.now() - 10 * 60_000).toISOString() })).rejects.toMatchObject({ code: 'clock_drift' });
    await expect(volunteerApi.checkIn({ ...base, qr_code_signature: 'wrong' })).rejects.toMatchObject({ code: 'qr_invalid' });
    const far = offsetMeters(MESKEL, 400, 0);
    await expect(volunteerApi.checkIn({ ...base, ...far })).rejects.toMatchObject({ code: 'outside_geofence' });
    await expect(volunteerApi.checkIn({ ...base, accuracy: 900 })).rejects.toMatchObject({ code: 'gps_inaccurate' });
    const ok = await volunteerApi.checkIn(base);
    expect(ok.attendance.qr_verified).toBe(true);
    // A second phone (or a double tap) cannot create a second check-in.
    await expect(volunteerApi.checkIn(base)).rejects.toMatchObject({ status: 409, code: 'already_checked_in' });
    const schedule = await volunteerApi.schedule();
    expect(schedule.find((a) => a.shift_id === base.shift_id)?.attendance?.check_out_time).toBeNull();
    // Leaving early needs a reason; hours wait for the coordinator.
    await expect(volunteerApi.checkOut({ shift_id: base.shift_id })).rejects.toMatchObject({ code: 'reason_required' });
    const before = db.t.volunteers.find((v) => v.id === 1)!.total_hours;
    const out = await volunteerApi.checkOut({ shift_id: base.shift_id, reason: 'Feeling unwell' });
    expect(out.result.hours_status).toBe('pending');
    expect(out.result.cumulative_hours).toBe(before);
    expect(out.result.can_resume).toBe(true);
    const resumed = await volunteerApi.resume(base.shift_id);
    expect(resumed.check_out_time).toBeNull();
  });

  it('blocks check-in for unapproved shifts', async () => {
    await signInAs(DEMO.otherVolunteer);
    await expect(
      volunteerApi.checkIn({ shift_id: liveShiftId(), qr_code_signature: DEMO_QR_SIGNATURE, ...MESKEL, client_timestamp: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('updates profile and lists certificates, documents, notifications, chat', async () => {
    await signInAs(DEMO.volunteer);
    const v = await volunteerApi.updateProfile({ skills: ['first_aid', 'medical'], bio: 'Updated' });
    expect(v.skills).toContain('medical');
    expect((await volunteerApi.certificates()).length).toBe(2);
    expect((await documentsApi.mine()).length).toBe(2);
    const n = await notificationsApi.list();
    expect(n.unread).toBeGreaterThan(0);
    const reply = await chatApi.send('When is my next shift?');
    expect(reply.response).toContain('Meskel Square Blood Drive');
    const amharic = await chatApi.send('ቀጣይ ፈረቃዬ መቼ ነው?');
    expect(amharic.response).toMatch(/[ሀ-፿]/);
    expect((await chatApi.history()).length).toBe(4);
  });

});

describe('coordinator operations', () => {
  it('creates an event + shift within bounds and rejects out-of-bounds shifts', async () => {
    await signInAs(DEMO.coordinator);
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const e = await opsApi.createEvent({ title: 'Test drive', location: 'Bole', start_date: toApiDate(start), end_date: toApiDate(start), geofence_radius: 120, latitude: 9, longitude: 38.7 });
    expect(e.status).toBe('upcoming');
    const s = new Date(start);
    s.setHours(9, 0, 0, 0);
    const shift = await opsApi.createShift(e.id, { start_time: toApiDateTime(s), end_time: toApiDateTime(new Date(s.getTime() + 3_600_000 * 2)), capacity: 5, required_skills: [] });
    expect(shift.capacity).toBe(5);
    const late = new Date(start);
    late.setDate(late.getDate() + 5);
    await expect(opsApi.createShift(e.id, { start_time: toApiDateTime(late), end_time: toApiDateTime(new Date(late.getTime() + 3_600_000)), capacity: 5, required_skills: [] })).rejects.toMatchObject({ message: expect.stringContaining('event boundaries') });
    await expect(opsApi.createEvent({ title: '', location: '', start_date: '2020-01-01', end_date: '2020-01-01' } as never)).rejects.toMatchObject({ status: 422 });
  });

  it('approves applications and enforces capacity', async () => {
    await signInAs(DEMO.coordinator);
    const apps = await opsApi.applications(1);
    const pending = apps.find((a) => a.status === 'pending')!;
    await opsApi.decide(pending.id, 'confirmed');
    const shift = db.t.shifts.find((s) => s.id === pending.shift_id)!;
    shift.capacity = db.t.assignments.filter((a) => a.shift_id === shift.id && a.status === 'confirmed').length;
    const another = db.t.assignments.find((a) => a.shift_id === shift.id && a.status === 'pending');
    if (another) await expect(opsApi.decide(another.id, 'confirmed')).rejects.toMatchObject({ message: 'Shift capacity has already been reached.' });
    const fb = await opsApi.aiFeedback(pending.id);
    expect(fb.ai_drafted_feedback).toMatch(/^Hi /);
  });

  it('isolates tenants', async () => {
    await signInAs(DEMO.otherCoordinator);
    await expect(opsApi.event(1)).rejects.toMatchObject({ status: 404 });
    const apps = db.t.assignments.find((a) => a.shift_id === liveShiftId())!;
    await expect(opsApi.decide(apps.id, 'confirmed')).rejects.toMatchObject({ status: 403 });
  });

  it('runs live-shift tools: QR, roster, force check-in, hours, broadcast', async () => {
    await signInAs(DEMO.coordinator);
    const shiftId = liveShiftId();
    const qr = await opsApi.qr(shiftId);
    expect(qr.token).toBeTruthy();
    expect(qr.period_seconds).toBe(30);
    const roster = await opsApi.roster(shiftId);
    expect(roster.meta?.capacity).toBeGreaterThan(0);
    const notIn = roster.entries.find((r) => r.status === 'confirmed' && !r.attendance)!;
    await opsApi.forceCheckIn(notIn.assignment_id, { id_verified: true, note: 'No phone' });
    await expect(opsApi.forceCheckIn(notIn.assignment_id, { id_verified: true })).rejects.toMatchObject({ message: 'Volunteer is already checked in to this shift.' });
    const pending = await opsApi.pendingHours();
    expect(pending.length).toBeGreaterThan(0);
    await opsApi.verifyHours(pending[0]!.id, { status: 'adjusted', verified_hours: 3.5 });
    const preview = await opsApi.broadcastPreview(shiftId);
    expect(preview.matching_volunteers).toBeGreaterThanOrEqual(0);
    const r = await opsApi.broadcast(shiftId);
    expect(r.notified).toBeGreaterThanOrEqual(0);
    expect((await opsApi.dashboard()).shifts_today).toBeGreaterThan(0);
  });

  it('manages directory, certificates, reports and announcements', async () => {
    await signInAs(DEMO.coordinator);
    const vols = await peopleApi.allVolunteers();
    expect(vols.length).toBeGreaterThan(10);
    const detail = await peopleApi.volunteer(1);
    expect(detail.skills_alignment.Medical).toBe(95);
    await expect(peopleApi.issueCertificate(1, 50)).rejects.toMatchObject({ status: 422 });
    const gen = await peopleApi.generateReport({ period: 'Q4 2026' });
    expect(gen.report?.period).toBe('Q4 2026');
    const queued = await peopleApi.generateReport({ period: 'Q4 2026', async: true });
    expect(queued.queued).toBe(true);
    const a = await announcementsApi.create({ title: 'Hello', message: 'World', target_audience: 'all' });
    expect((await announcementsApi.list()).items[0]!.id).toBe(a.announcement.id);
    const queue = await documentsApi.queue('pending');
    const reviewed = await documentsApi.review(queue[0]!.id, { status: 'verified', notes: 'Looks good' });
    expect(reviewed.verification_status).toBe('verified');
  });
});

describe('org admin & platform', () => {
  it('manages organization settings and staff', async () => {
    await signInAs(DEMO.orgadmin);
    const org = await orgApi.update({ phone: '+251 900 000 000' });
    expect(org.phone).toBe('+251 900 000 000');
    await expect(orgApi.update({ website: 'not a url' })).rejects.toMatchObject({ status: 422 });
    const c = await orgApi.createCoordinator({ first_name: 'Coord', last_name: 'Two', email: 'coord2@rc.org' });
    expect(c.user.role).toBe('Coordinator');
    expect(c.invitation.invite_url).toContain('/invite/');
    const toggled = await orgApi.toggleCoordinator(c.user.id);
    expect(toggled.is_active).toBe(false);
    const members = await orgApi.allMembers();
    const vol = members.find((m) => m.role === 'Volunteer')!;
    expect((await orgApi.toggleVolunteer(vol.id)).is_active).toBe(!vol.is_active);
    expect((await orgApi.analytics()).volunteers).toBeGreaterThan(5);
    expect((await orgApi.audit()).items.every((l) => l.org_id === 1)).toBe(true);
  });

  it('onboards tenants and changes status', async () => {
    await signInAs(DEMO.superadmin);
    const m = await platformApi.metrics();
    const result = await platformApi.onboard({
      org_name: 'New NGO',
      org_email: 'ngo@new.org',
      org_country: 'ET',
      org_city: 'Adama',
      org_phone: '+251911000222',
      admin_first_name: 'Ngo',
      admin_last_name: 'Admin',
      admin_email: 'admin@new.org',
    });
    expect(result.admin.role).toBe('OrgAdmin');
    expect(result.invitation.email_sent).toBe(true);
    expect((await platformApi.metrics()).total_organizations).toBe(m.total_organizations + 1);
    const updated = await platformApi.updateStatus(result.organization.id, { status: 'suspended' });
    expect(updated.status).toBe('suspended');
    const audit = await platformApi.audit();
    expect(audit.items[0]!.action).toBe('tenant.status_updated');
    expect(audit.items[0]!.actor?.role).toBe('SuperAdmin');
    expect((await platformApi.timeseries()).length).toBe(12);
    expect((await platformApi.users({ role: 'SuperAdmin' })).items.length).toBe(1);
  });

  it('denies wrong roles', async () => {
    await signInAs(DEMO.volunteer);
    await expect(platformApi.metrics()).rejects.toMatchObject({ status: 403 });
    await expect(orgApi.organization()).rejects.toMatchObject({ status: 403 });
  });
});

describe('public', () => {
  it('lists organizations, stats and verifies certificates', async () => {
    const orgs = await publicApi.organizations();
    expect(orgs.every((o) => o.name !== 'Lalibela Youth Network')).toBe(true);
    expect((await publicApi.stats()).verified_hours).toBeGreaterThan(100);
    const ok = await publicApi.verifyCertificate('VMS-00001');
    expect(ok.valid && ok.data.volunteer_name).toBe('Red C.');
    const bad = await publicApi.verifyCertificate('VMS-99999');
    expect(bad.valid).toBe(false);
  });
});
