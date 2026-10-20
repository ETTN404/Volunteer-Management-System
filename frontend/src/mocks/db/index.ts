import { createSeed } from './seed';
import type {
  AnnouncementRow,
  AssignmentRow,
  AttendanceRow,
  CertificateRow,
  DocumentRow,
  EventRow,
  OrganizationRow,
  ReportRow,
  ShiftRow,
  Tables,
  UserRow,
  VolunteerRow,
} from './schema';
import type {
  Announcement,
  Attendance,
  Certificate,
  Organization,
  PlanKey,
  Report,
  Shift,
  ShiftAssignment,
  User,
  VmsEvent,
  Volunteer,
  VolunteerDocument,
} from '@/shared/types/api';
import { matchScore } from '@/shared/lib/skills';

const STORAGE_KEY = 'vt-mockdb-v1';
const canPersist = typeof window !== 'undefined' && typeof localStorage !== 'undefined' && import.meta.env.MODE !== 'test';

function load(): Tables {
  if (canPersist) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; tables: Tables };
        // Re-seed daily so relative dates (live shift, check-in window) stay meaningful.
        if (Date.now() - parsed.savedAt < 12 * 3_600_000) return parsed.tables;
      }
    } catch {
      /* corrupted — reseed */
    }
  }
  return createSeed();
}

export const db: { t: Tables } = { t: load() };

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), tables: db.t }));
  } catch {
    /* quota — ignore */
  }
}
/** Debounced save; `immediate` for writes that must survive an instant reload (e.g. new tokens). */
export function persist(immediate = false) {
  if (!canPersist) return;
  if (immediate) return flush();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
if (canPersist) window.addEventListener('pagehide', () => saveTimer && flush());

export function resetDb(now?: Date) {
  db.t = createSeed(now);
  if (canPersist) localStorage.removeItem(STORAGE_KEY);
}

export function nextId(rows: { id: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

export const nowIso = () => new Date().toISOString();

/* ---------------- Laravel serialization helpers ---------------- */

/** Carbon datetime cast → JSON: "2026-10-16T09:00:00.000000Z" */
export const carbonJson = (isoString: string | null) => (isoString ? isoString.replace(/\.\d{3}Z$/, '.000000Z') : null);
/** toDateTimeString() → "2026-10-16 09:00:00" (UTC) */
export const dateTimeString = (isoString: string) => isoString.slice(0, 19).replace('T', ' ');

/* ---------------- Lookups ---------------- */

export const find = {
  user: (id: number) => db.t.users.find((u) => u.id === id),
  userByEmail: (email: string) => db.t.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  org: (id: number | null) => (id == null ? undefined : db.t.organizations.find((o) => o.id === id)),
  volunteer: (id: number) => db.t.volunteers.find((v) => v.id === id),
  volunteerByUser: (userId: number) => db.t.volunteers.find((v) => v.user_id === userId),
  event: (id: number) => db.t.events.find((e) => e.id === id),
  shift: (id: number) => db.t.shifts.find((s) => s.id === id),
  assignment: (id: number) => db.t.assignments.find((a) => a.id === id),
  eventOfShift: (shiftId: number) => {
    const s = db.t.shifts.find((x) => x.id === shiftId);
    return s ? db.t.events.find((e) => e.id === s.event_id) : undefined;
  },
  orgOfVolunteer: (volunteerId: number) => {
    const v = db.t.volunteers.find((x) => x.id === volunteerId);
    const u = v ? db.t.users.find((x) => x.id === v.user_id) : undefined;
    return u?.org_id ?? null;
  },
};

export const confirmedCount = (shiftId: number) =>
  db.t.assignments.filter((a) => a.shift_id === shiftId && a.status === 'confirmed').length;

/* ---------------- Resources (mirror app/Http/Resources) ---------------- */

export const res = {
  org(o: OrganizationRow): Organization {
    return {
      id: o.id,
      name: o.name,
      email: o.email,
      address: o.address,
      phone: o.phone,
      website: o.website,
      status: o.status,
      subscription_plan: o.subscription_plan as PlanKey | null,
      logo_url: o.logo_path,
      created_at: dateTimeString(o.created_at),
      primary_color: o.primary_color,
      subdomain: o.subdomain,
    };
  },

  user(u: UserRow, load: { volunteer?: boolean; organization?: boolean } = {}): User {
    const out: User = {
      id: u.id,
      org_id: u.org_id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      profile_photo_url: u.profile_photo_path,
      last_login: u.last_login ? dateTimeString(u.last_login) : null,
      created_at: dateTimeString(u.created_at),
    };
    if (load.volunteer) {
      const v = find.volunteerByUser(u.id);
      if (v) out.volunteer = res.volunteer(v);
    }
    if (load.organization) {
      const o = find.org(u.org_id);
      if (o) out.organization = res.org(o);
    }
    return out;
  },

  volunteer(v: VolunteerRow, load: { user?: boolean } = {}): Volunteer {
    const age = v.date_of_birth ? (Date.now() - new Date(v.date_of_birth).getTime()) / (365.25 * 86_400_000) : null;
    const out: Volunteer = {
      id: v.id,
      skills: v.skills,
      availability: v.availability,
      bio: v.bio,
      total_hours: v.total_hours,
      impact_score: v.impact_score,
      created_at: dateTimeString(v.created_at),
      date_of_birth: v.date_of_birth,
      is_minor: age != null && age < 18,
      parental_consent_verified: v.parental_consent_verified,
      skills_verification: v.skills_verification,
    };
    if (load.user) {
      const u = find.user(v.user_id);
      if (u) out.user = res.user(u);
    }
    return out;
  },

  shift(s: ShiftRow, load: { event?: boolean; matchFor?: string[] } = {}): Shift {
    const out: Shift = {
      id: s.id,
      event_id: s.event_id,
      start_time: carbonJson(s.start_time)!,
      end_time: carbonJson(s.end_time)!,
      required_skills: s.required_skills,
      capacity: s.capacity,
      qr_expires_at: carbonJson(s.qr_expires_at),
      created_at: dateTimeString(s.created_at),
      confirmed_count: confirmedCount(s.id),
    };
    if (load.matchFor) out.match_score = matchScore(load.matchFor, s.required_skills);
    if (load.event) {
      const e = find.event(s.event_id);
      if (e) out.event = res.event(e);
    }
    return out;
  },

  event(e: EventRow, load: { shifts?: boolean; matchFor?: string[] } = {}): VmsEvent {
    const out: VmsEvent = {
      id: e.id,
      org_id: e.org_id,
      title: e.title,
      description: e.description,
      location: e.location,
      coordinates: { latitude: e.latitude, longitude: e.longitude },
      geofence_radius: e.geofence_radius,
      start_date: e.start_date,
      end_date: e.end_date,
      status: e.status,
      created_at: dateTimeString(e.created_at),
    };
    if (load.shifts) {
      out.shifts = db.t.shifts
        .filter((s) => s.event_id === e.id)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((s) => res.shift(s, { matchFor: load.matchFor }));
    }
    return out;
  },

  assignment(a: AssignmentRow, load: { shift?: boolean; shiftEvent?: boolean; volunteer?: boolean } = {}): ShiftAssignment {
    const out: ShiftAssignment = {
      id: a.id,
      shift_id: a.shift_id,
      volunteer_id: a.volunteer_id,
      status: a.status,
      applied_at: dateTimeString(a.created_at),
      decline_reason: a.decline_reason,
    };
    if (load.shift) {
      const s = find.shift(a.shift_id);
      if (s) out.shift = res.shift(s, { event: load.shiftEvent });
    }
    if (load.volunteer) {
      const v = find.volunteer(a.volunteer_id);
      if (v) out.volunteer = res.volunteer(v, { user: true });
    }
    return out;
  },

  attendance(a: AttendanceRow, load: { shift?: boolean } = {}): Attendance {
    const out: Attendance = {
      id: a.id,
      shift_id: a.shift_id,
      volunteer_id: a.volunteer_id,
      check_in_time: carbonJson(a.check_in_time)!,
      check_out_time: carbonJson(a.check_out_time),
      qr_verified: a.qr_verified,
      created_at: dateTimeString(a.created_at),
      hours_status: a.hours_status,
      verified_hours: a.verified_hours,
      hours: Math.round(((new Date(a.check_out_time ?? Date.now()).getTime() - new Date(a.check_in_time).getTime()) / 3_600_000) * 100) / 100,
      check_in_method: a.check_in_method ?? (a.qr_verified ? 'self' : 'manual'),
      check_out_method: a.check_out_method ?? (a.check_out_time ? 'self' : null),
      check_out_reason: a.check_out_reason ?? null,
      verification_note: a.verification_note ?? null,
      flags: (a.flags ?? []) as Attendance['flags'],
      presence: { pings: 0, inside: 0, last_ping_at: null },
      can_resume:
        Boolean(a.check_out_time) &&
        (a.check_out_method ?? 'self') === 'self' &&
        a.hours_status === 'pending' &&
        Date.now() - new Date(a.check_out_time!).getTime() < 10 * 60_000 &&
        (find.shift(a.shift_id) ? new Date(find.shift(a.shift_id)!.end_time).getTime() > Date.now() : false),
    };
    if (load.shift) {
      const s = find.shift(a.shift_id);
      if (s) out.shift = res.shift(s, { event: true });
    }
    return out;
  },

  certificate(c: CertificateRow, origin: string): Certificate {
    return {
      id: c.id,
      volunteer_id: c.volunteer_id,
      org_id: c.org_id,
      issued_date: `${c.issued_date}T00:00:00.000000Z`,
      milestone_hours: c.milestone_hours,
      download_url: `${origin}/${c.file_path}`,
      created_at: dateTimeString(c.created_at),
    };
  },

  report(r: ReportRow, origin: string): Report {
    return {
      id: r.id,
      org_id: r.org_id,
      generated_by: r.generated_by,
      period: r.period,
      total_volunteers: r.total_volunteers,
      total_hours: r.total_hours,
      status: r.status,
      download_url: r.file_path ? `${origin}/${r.file_path}` : null,
      created_at: dateTimeString(r.created_at),
    };
  },

  announcement(a: AnnouncementRow, withPoster = true): Announcement {
    const poster = find.user(a.posted_by);
    return {
      id: a.id,
      org_id: a.org_id,
      posted_by: a.posted_by,
      title: a.title,
      message: a.message,
      target_audience: a.target_audience,
      created_at: dateTimeString(a.created_at),
      ...(withPoster && poster ? { poster: { id: poster.id, full_name: poster.full_name } } : {}),
    };
  },

  document(d: DocumentRow, load: { volunteer?: boolean } = {}): VolunteerDocument {
    const out: VolunteerDocument = {
      id: d.id,
      volunteer_id: d.volunteer_id,
      document_type: d.document_type,
      title: d.title,
      file_url: d.file_url,
      mime_type: d.mime_type,
      file_size_bytes: d.file_size_bytes,
      verification_status: d.verification_status,
      coordinator_notes: d.coordinator_notes,
      verified_at: d.verified_at ? dateTimeString(d.verified_at) : null,
      created_at: dateTimeString(d.created_at),
    };
    if (load.volunteer) {
      const v = find.volunteer(d.volunteer_id);
      if (v) out.volunteer = res.volunteer(v, { user: true });
    }
    return out;
  },
};

export function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), lastPage);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    pagination: { current_page: current, last_page: lastPage, per_page: perPage, total },
  };
}

export function audit(
  action: string,
  actor: UserRow | null,
  model: { type: string; id: number } | null,
  oldValues: Record<string, unknown> | null = null,
  newValues: Record<string, unknown> | null = null,
) {
  db.t.audit.unshift({
    id: nextId(db.t.audit),
    user_id: actor?.id ?? null,
    org_id: actor?.org_id ?? null,
    action,
    model_type: model ? `App\\Models\\${model.type}` : null,
    model_id: model?.id ?? null,
    old_values: oldValues,
    new_values: newValues,
    ip_address: '127.0.0.1',
    created_at: nowIso(),
  });
}
