/**
 * Deterministic demo dataset. Accounts 1–7 match database/seeders/DatabaseSeeder.php exactly
 * (password "password"); everything else is rich demo data placed around Addis Ababa, with
 * times relative to "now" so there is always a live shift, an open check-in window and history.
 */
import type {
  AnnouncementRow,
  AssignmentRow,
  AttendanceRow,
  AuditRow,
  CertificateRow,
  DocumentRow,
  EventRow,
  NotificationRow,
  OrganizationRow,
  ReportRow,
  ShiftRow,
  Tables,
  UserRow,
  VolunteerRow,
} from './schema';

export const DEMO_QR_SIGNATURE = 'VT-DEMO-7F3A9C21';
export const DEMO_PASSWORD = 'password';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeed(now: Date = new Date()): Tables {
  const rand = mulberry32(20261016);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const sample = <T>(arr: readonly T[], n: number): T[] => [...arr].sort(() => rand() - 0.5).slice(0, n);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const at = (dayOffset: number, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const iso = (d: Date) => d.toISOString();
  const dateOnly = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const minutesFromNow = (m: number) => new Date(now.getTime() + m * 60_000);

  /* ---------------- Organizations ---------------- */
  const organizations: OrganizationRow[] = [
    { id: 1, name: 'Red Cross Ethiopia', email: 'contact@redcross.org', address: 'Ras Desta Damtew Ave, Addis Ababa', phone: '+251 11 515 3853', website: 'https://redcrosseth.org', logo_path: null, status: 'active', subscription_plan: 'enterprise', primary_color: null, subdomain: 'redcross', created_at: iso(at(-420)) },
    { id: 2, name: 'Save the Children', email: 'info@savethechildren.org', address: 'Bole Sub-City, Addis Ababa', phone: '+251 11 629 4040', website: 'https://ethiopia.savethechildren.net', logo_path: null, status: 'active', subscription_plan: 'pro', primary_color: null, subdomain: 'savethechildren', created_at: iso(at(-380)) },
    { id: 3, name: 'Addis Food Bank Collective', email: 'hello@addisfoodbank.org', address: 'Piazza, Arada, Addis Ababa', phone: '+251 91 120 4455', website: 'https://addisfoodbank.org', logo_path: null, status: 'active', subscription_plan: 'pro', primary_color: null, subdomain: 'addisfoodbank', created_at: iso(at(-200)) },
    { id: 4, name: 'Entoto Green Corps', email: 'team@entotogreen.org', address: 'Entoto, Gulele, Addis Ababa', phone: null, website: null, logo_path: null, status: 'active', subscription_plan: 'free', primary_color: null, subdomain: 'entotogreen', created_at: iso(at(-95)) },
    { id: 5, name: 'Lalibela Youth Network', email: 'admin@lalibelayouth.org', address: 'Lalibela, Amhara', phone: null, website: null, logo_path: null, status: 'suspended', subscription_plan: 'free', primary_color: null, subdomain: 'lalibelayouth', created_at: iso(at(-60)) },
  ];

  /* ---------------- Users (1–7 = Laravel seeder) ---------------- */
  const users: UserRow[] = [];
  const addUser = (u: Omit<UserRow, 'id' | 'password' | 'is_active' | 'profile_photo_path' | 'last_login' | 'created_at'> & Partial<UserRow>) => {
    const row: UserRow = {
      id: users.length + 1,
      password: DEMO_PASSWORD,
      is_active: true,
      profile_photo_path: null,
      last_login: iso(minutesFromNow(-Math.floor(rand() * 9000))),
      created_at: iso(at(-Math.floor(30 + rand() * 300))),
      ...u,
    };
    users.push(row);
    return row;
  };

  addUser({ org_id: null, full_name: 'General System Admin', email: 'superadmin@vms.com', role: 'SuperAdmin' });
  addUser({ org_id: 1, full_name: 'Red Cross Admin', email: 'redcross.admin@vms.com', role: 'OrgAdmin' });
  addUser({ org_id: 1, full_name: 'Red Cross Coordinator', email: 'redcross.coord@vms.com', role: 'Coordinator' });
  addUser({ org_id: 1, full_name: 'Red Cross Volunteer', email: 'redcross.vol@vms.com', role: 'Volunteer' });
  addUser({ org_id: 2, full_name: 'Save the Children Admin', email: 'savechildren.admin@vms.com', role: 'OrgAdmin' });
  addUser({ org_id: 2, full_name: 'Save the Children Coordinator', email: 'savechildren.coord@vms.com', role: 'Coordinator' });
  addUser({ org_id: 2, full_name: 'Save the Children Volunteer', email: 'savechildren.vol@vms.com', role: 'Volunteer' });
  addUser({ org_id: 1, full_name: 'Mekdes Alemayehu', email: 'mekdes.coord@redcross.org', role: 'Coordinator' });
  addUser({ org_id: 3, full_name: 'Samrawit Kassa', email: 'admin@addisfoodbank.org', role: 'OrgAdmin' });
  addUser({ org_id: 3, full_name: 'Tewodros Lemma', email: 'coord@addisfoodbank.org', role: 'Coordinator' });
  addUser({ org_id: 4, full_name: 'Aster Bayou', email: 'admin@entotogreen.org', role: 'OrgAdmin' });
  addUser({ org_id: 5, full_name: 'Gebre Mariam', email: 'admin@lalibelayouth.org', role: 'OrgAdmin' });

  /* ---------------- Volunteers ---------------- */
  const volunteers: VolunteerRow[] = [];
  const addVolunteer = (userId: number, v: Partial<VolunteerRow>) => {
    const row: VolunteerRow = {
      id: volunteers.length + 1,
      user_id: userId,
      skills: [],
      availability: [],
      total_hours: 0,
      impact_score: 0,
      bio: null,
      date_of_birth: null,
      parental_consent_verified: false,
      skills_verification: {},
      created_at: users.find((u) => u.id === userId)!.created_at,
      ...v,
    };
    volunteers.push(row);
    return row;
  };

  // Seeder volunteers (demo-enriched hours so milestones and charts have something to show).
  const rcVol = addVolunteer(4, {
    skills: ['first_aid', 'disaster_response', 'translation'],
    availability: { weekends: true, weekdays_morning: true },
    total_hours: 46.5,
    impact_score: 38.2,
    bio: 'Dedicated humanitarian volunteer passionate about community service and emergency response.',
    date_of_birth: '1998-04-12',
    skills_verification: { first_aid: 'verified', disaster_response: 'pending', translation: 'unverified' },
  });
  const scVol = addVolunteer(7, {
    skills: ['teaching', 'child_care', 'storytelling'],
    availability: { saturdays: true, weekdays_afternoon: true },
    total_hours: 25,
    impact_score: 21.4,
    bio: 'Eager to educate and support child welfare program developments globally.',
    date_of_birth: '2001-09-30',
    skills_verification: { teaching: 'verified', child_care: 'verified', storytelling: 'unverified' },
  });

  const NAMES = [
    'Hana Tesfaye', 'Dawit Bekele', 'Meron Alemu', 'Yonas Girma', 'Selam Haile', 'Abel Tadesse',
    'Liya Mengistu', 'Samuel Wolde', 'Bethlehem Assefa', 'Kidus Fikre', 'Ruth Abebe', 'Nahom Desta',
    'Tigist Worku', 'Eyob Kebede', 'Mahlet Yohannes', 'Biruk Demissie', 'Saron Getachew', 'Henok Ayele',
    'Feven Mulugeta', 'Natnael Shiferaw', 'Rahel Tilahun', 'Ermias Negash', 'Tsion Habte', 'Mikias Berhanu',
    'Lidya Solomon', 'Robel Asfaw', 'Kalkidan Mesfin', 'Yared Teshome', 'Hiwot Gebru', 'Amanuel Taye',
  ] as const;
  const SKILL_POOL = [
    'first_aid', 'medical', 'nursing', 'logistics', 'driving', 'teaching', 'translation', 'amharic',
    'afaan_oromo', 'heavy_lifting', 'cooking', 'food_distribution', 'child_care', 'counseling',
    'leadership', 'photography', 'it_support', 'disaster_response', 'storytelling', 'event_planning',
  ] as const;
  const AVAIL = ['weekday_mornings', 'weekday_afternoons', 'weekday_evenings', 'saturdays', 'sundays', 'holidays'] as const;
  const BIOS = [
    'Nursing student at Addis Ababa University. Happiest when I am useful on the ground.',
    'Logistics coordinator by day; I spend weekends moving supplies where they are needed.',
    'Retired teacher. I tutor kids in Amharic and maths and help at reading corners.',
    'Software engineer who volunteers for disaster response and IT support.',
    'Community health worker. Fluent in Amharic, Afaan Oromo and English.',
    'University student organizing youth volunteers in my neighborhood.',
    null,
  ];
  const ORG_SPLIT = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 1, 3, 1] as const;

  NAMES.forEach((name, i) => {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
    const orgId = ORG_SPLIT[i]!;
    const u = addUser({ org_id: orgId, full_name: name, email: `${slug}@mail.et`, role: 'Volunteer', is_active: i !== 9 });
    const hours = round2(rand() < 0.15 ? rand() * 6 : 4 + rand() * 170);
    const skills = sample(SKILL_POOL, 2 + Math.floor(rand() * 3));
    const minor = i === 12 || i === 23;
    addVolunteer(u.id, {
      skills,
      availability: sample(AVAIL, 2 + Math.floor(rand() * 3)),
      total_hours: hours,
      impact_score: round2(Math.min(100, hours * 0.1 * (1 + rand() * 0.45) * 6)),
      bio: pick(BIOS),
      date_of_birth: minor ? `${now.getFullYear() - 16}-03-1${i % 9}` : `${1975 + Math.floor(rand() * 30)}-0${1 + (i % 9)}-1${i % 9}`,
      parental_consent_verified: minor ? i === 23 : false,
      skills_verification: Object.fromEntries(skills.map((s) => [s, pick(['verified', 'verified', 'pending', 'unverified'] as const)])),
    });
  });

  /* ---------------- Events & shifts ---------------- */
  const events: EventRow[] = [];
  const shifts: ShiftRow[] = [];
  const addEvent = (e: Omit<EventRow, 'id' | 'created_at'> & { createdDaysAgo?: number }) => {
    const { createdDaysAgo = 20, ...rest } = e;
    const row: EventRow = { id: events.length + 1, created_at: iso(at(-createdDaysAgo)), ...rest };
    events.push(row);
    return row;
  };
  const addShift = (eventId: number, start: Date, hours: number, skills: string[], capacity: number, sig?: string) => {
    const row: ShiftRow = {
      id: shifts.length + 1,
      event_id: eventId,
      start_time: iso(start),
      end_time: iso(new Date(start.getTime() + hours * 3_600_000)),
      required_skills: skills,
      capacity,
      qr_code_signature: sig ?? `qr${Math.floor(rand() * 1e12).toString(16)}`,
      qr_expires_at: iso(minutesFromNow(sig ? 15 : -60 * 24)),
      created_at: iso(at(-10)),
    };
    shifts.push(row);
    return row;
  };

  // A live shift that started 5 minutes ago — the check-in window is open right now.
  const liveStart = minutesFromNow(-5);

  const e1 = addEvent({ org_id: 1, title: 'Meskel Square Blood Drive', description: 'A three-day citywide blood donation drive with the National Blood Bank. Volunteers greet donors, run registration, support nurses and look after donors during recovery.', location: 'Meskel Square, Kirkos, Addis Ababa', latitude: 9.010733, longitude: 38.761269, start_date: dateOnly(at(-1)), end_date: dateOnly(at(2)), status: 'ongoing', geofence_radius: 150 });
  const s1 = addShift(e1.id, liveStart, 4, ['first_aid', 'medical'], 12, DEMO_QR_SIGNATURE);
  const s2 = addShift(e1.id, at(1, 8), 5, ['first_aid'], 15);
  addShift(e1.id, at(2, 13), 4, [], 10);
  const s0 = addShift(e1.id, at(-1, 9), 6, ['first_aid', 'medical'], 12);

  const e2 = addEvent({ org_id: 1, title: 'Flood Response Kit Assembly', description: 'Assemble and load 2,000 emergency kits (water purification, blankets, hygiene) for families displaced by flooding in Afar. Heavy lifting involved; safety briefing at the start of every shift.', location: 'ERCS Logistics Warehouse, Akaki Kality', latitude: 8.870211, longitude: 38.789904, start_date: dateOnly(at(3)), end_date: dateOnly(at(5)), status: 'upcoming', geofence_radius: 200 });
  const s4 = addShift(e2.id, at(3, 8), 6, ['logistics', 'heavy_lifting', 'disaster_response'], 20);
  addShift(e2.id, at(4, 8), 6, ['logistics', 'heavy_lifting'], 20);
  addShift(e2.id, at(5, 14), 4, ['logistics', 'driving'], 8);

  const e3 = addEvent({ org_id: 1, title: 'First Aid Training for Taxi Drivers', description: 'Teach basic life support and bleeding control to minibus drivers at the Bole terminal, in Amharic. Certified first-aiders lead; helpers run registration and demos.', location: 'Bole Bus Terminal, Bole', latitude: 8.995012, longitude: 38.789044, start_date: dateOnly(at(7)), end_date: dateOnly(at(7)), status: 'upcoming', geofence_radius: 100 });
  const s7 = addShift(e3.id, at(7, 9), 3, ['first_aid', 'teaching', 'amharic'], 6);
  addShift(e3.id, at(7, 14), 3, ['first_aid', 'teaching'], 6);

  const e4 = addEvent({ org_id: 1, title: 'Merkato Fire Safety Awareness', description: 'Door-to-door fire safety awareness with shop owners in Merkato after the dry-season fires.', location: 'Merkato, Addis Ketema', latitude: 9.030412, longitude: 38.740188, start_date: dateOnly(at(-21)), end_date: dateOnly(at(-20)), status: 'completed', geofence_radius: 300, createdDaysAgo: 45 });
  const s9 = addShift(e4.id, at(-21, 9), 5, ['amharic', 'leadership'], 25);
  addShift(e4.id, at(-20, 9), 5, ['amharic'], 25);

  const e5 = addEvent({ org_id: 1, title: 'Entoto Hillside Medical Camp', description: 'Two-day mobile clinic for families on the Entoto hillside: screenings, vaccinations and referrals. Translators for Afaan Oromo are especially needed.', location: 'Entoto Kidane Mihret, Gulele', latitude: 9.087212, longitude: 38.763011, start_date: dateOnly(at(12)), end_date: dateOnly(at(13)), status: 'upcoming', geofence_radius: 250 });
  const s11 = addShift(e5.id, at(12, 7), 8, ['medical', 'nursing', 'translation'], 10);
  addShift(e5.id, at(13, 7), 8, ['medical', 'afaan_oromo'], 10);

  const e6 = addEvent({ org_id: 1, title: 'Black Lion Hospital Patient Escort', description: 'Weekly programme guiding patients and families through Tikur Anbessa Specialized Hospital — wayfinding, translation and comfort.', location: 'Tikur Anbessa Hospital, Lideta', latitude: 9.020487, longitude: 38.748702, start_date: dateOnly(at(-35)), end_date: dateOnly(at(30)), status: 'ongoing', geofence_radius: 120, createdDaysAgo: 50 });
  const pastEscort: ShiftRow[] = [];
  for (let w = 5; w >= 1; w--) pastEscort.push(addShift(e6.id, at(-7 * w, 8), 4, ['first_aid', 'translation'], 6));
  addShift(e6.id, at(6, 8), 4, ['first_aid', 'translation'], 6);

  const e7 = addEvent({ org_id: 1, title: 'Bole Community Health Fair', description: 'Blood pressure and diabetes screening fair with the Bole sub-city health office.', location: 'Bole Medhanialem Grounds', latitude: 8.996915, longitude: 38.785544, start_date: dateOnly(at(-44)), end_date: dateOnly(at(-44)), status: 'completed', geofence_radius: 150, createdDaysAgo: 70 });
  const s14 = addShift(e7.id, at(-44, 8), 7, ['medical', 'first_aid', 'counseling'], 14);

  const e8 = addEvent({ org_id: 2, title: 'Reading Corners at Sidist Kilo', description: 'Read aloud with children aged 6–10 and help them pick books to take home. Amharic and English sessions.', location: 'Addis Ababa University, Sidist Kilo', latitude: 9.045011, longitude: 38.762144, start_date: dateOnly(at(2)), end_date: dateOnly(at(16)), status: 'upcoming', geofence_radius: 100 });
  const s15 = addShift(e8.id, at(2, 10), 3, ['teaching', 'storytelling'], 8);
  const s16 = addShift(e8.id, at(9, 10), 3, ['teaching', 'child_care'], 8);
  const e9 = addEvent({ org_id: 2, title: 'Back-to-School Kit Packing', description: 'Pack 5,000 school kits before Meskerem. Fast, joyful, and a little loud.', location: 'Save the Children Warehouse, Kality', latitude: 8.904211, longitude: 38.766045, start_date: dateOnly(at(4)), end_date: dateOnly(at(4)), status: 'upcoming', geofence_radius: 150 });
  addShift(e9.id, at(4, 9), 5, ['logistics'], 30);
  const e10 = addEvent({ org_id: 2, title: "Children's Day Festival", description: 'Games, face painting and safety stations for 800 children.', location: 'Friendship Park, Arat Kilo', latitude: 9.033412, longitude: 38.763301, start_date: dateOnly(at(-30)), end_date: dateOnly(at(-30)), status: 'completed', geofence_radius: 200, createdDaysAgo: 60 });
  const s18 = addShift(e10.id, at(-30, 9), 6, ['child_care'], 40);

  const e11 = addEvent({ org_id: 3, title: 'Saturday Food Distribution — Piazza', description: 'Sort, pack and hand out food parcels to 300 households.', location: 'Piazza, Arada', latitude: 9.035221, longitude: 38.751044, start_date: dateOnly(at(1)), end_date: dateOnly(at(29)), status: 'ongoing', geofence_radius: 120 });
  addShift(e11.id, at(1, 7), 5, ['food_distribution', 'cooking'], 18);
  addShift(e11.id, at(8, 7), 5, ['food_distribution'], 18);
  const e12 = addEvent({ org_id: 4, title: 'Entoto Tree Planting Day', description: 'Plant 3,000 indigenous seedlings along the Entoto ridge trail.', location: 'Entoto Park, Gulele', latitude: 9.095012, longitude: 38.770122, start_date: dateOnly(at(10)), end_date: dateOnly(at(10)), status: 'upcoming', geofence_radius: 400 });
  addShift(e12.id, at(10, 7), 6, ['heavy_lifting'], 50);

  /* ---------------- Assignments & attendance ---------------- */
  const assignments: AssignmentRow[] = [];
  const attendances: AttendanceRow[] = [];
  const assign = (shift: ShiftRow, volunteerId: number, status: AssignmentRow['status'], decline?: string) => {
    const created = new Date(new Date(shift.start_time).getTime() - (2 + rand() * 9) * 86_400_000);
    const row: AssignmentRow = {
      id: assignments.length + 1,
      shift_id: shift.id,
      volunteer_id: volunteerId,
      status,
      assigned_at: status === 'confirmed' ? iso(new Date(created.getTime() + 3_600_000 * 20)) : null,
      decline_reason: decline ?? null,
      created_at: iso(created),
    };
    assignments.push(row);
    return row;
  };
  const attend = (shift: ShiftRow, volunteerId: number, opts: { lateMin?: number; out?: boolean; earlyLeaveMin?: number; qr?: boolean; status?: AttendanceRow['hours_status'] } = {}) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const inT = new Date(start.getTime() + (opts.lateMin ?? Math.floor(rand() * 20) - 10) * 60_000);
    const outT = opts.out === false ? null : new Date(end.getTime() - (opts.earlyLeaveMin ?? Math.floor(rand() * 25)) * 60_000);
    const ev = events.find((e) => e.id === shift.event_id)!;
    const row: AttendanceRow = {
      id: attendances.length + 1,
      shift_id: shift.id,
      volunteer_id: volunteerId,
      check_in_time: iso(inT),
      check_out_time: outT ? iso(outT) : null,
      qr_verified: opts.qr ?? true,
      latitude: ev.latitude ? ev.latitude + (rand() - 0.5) * 0.0008 : null,
      longitude: ev.longitude ? ev.longitude + (rand() - 0.5) * 0.0008 : null,
      signature_data: null,
      hours_status: opts.status ?? (outT ? 'verified' : 'pending'),
      verified_hours: null,
      created_at: iso(inT),
    };
    attendances.push(row);
    return row;
  };

  // The demo volunteer's story.
  assign(s1, rcVol.id, 'confirmed');
  assign(s2, rcVol.id, 'pending');
  assign(s4, rcVol.id, 'confirmed');
  assign(s7, rcVol.id, 'pending');
  assign(s11, rcVol.id, 'cancelled', 'This camp needs licensed nurses for every slot. We would love you on the Escort programme instead.');
  for (const s of [s9, s14, s0, ...pastEscort]) {
    assign(s, rcVol.id, 'confirmed');
    attend(s, rcVol.id, { status: s === pastEscort[pastEscort.length - 1] ? 'pending' : 'verified' });
  }
  assign(s15, scVol.id, 'confirmed');
  assign(s16, scVol.id, 'pending');
  assign(s18, scVol.id, 'confirmed');
  attend(s18, scVol.id);

  const orgVols = (orgId: number) =>
    volunteers.filter((v) => users.find((u) => u.id === v.user_id)?.org_id === orgId && v.id > 2);

  const shiftsByOrg = (orgId: number) => shifts.filter((s) => events.find((e) => e.id === s.event_id)?.org_id === orgId);

  for (const orgId of [1, 2, 3, 4]) {
    const vols = orgVols(orgId);
    for (const shift of shiftsByOrg(orgId)) {
      const isPast = new Date(shift.end_time) < now;
      const isLive = shift.id === s1.id;
      const count = Math.min(vols.length, Math.max(1, Math.floor(shift.capacity * (0.35 + rand() * 0.55))));
      for (const v of sample(vols, count)) {
        if (assignments.some((a) => a.shift_id === shift.id && a.volunteer_id === v.id)) continue;
        const roll = rand();
        const status: AssignmentRow['status'] = isPast || isLive ? (roll < 0.9 ? 'confirmed' : 'cancelled') : roll < 0.55 ? 'confirmed' : roll < 0.9 ? 'pending' : 'cancelled';
        assign(shift, v.id, status);
        if (status === 'confirmed' && isPast && rand() < 0.88) attend(shift, v.id, { status: rand() < 0.8 ? 'verified' : 'pending' });
        if (status === 'confirmed' && isLive && rand() < 0.6) attend(shift, v.id, { out: false, lateMin: -Math.floor(rand() * 10) });
      }
    }
  }

  /* ---------------- Certificates ---------------- */
  const certificates: CertificateRow[] = [];
  const addCert = (volunteerId: number, orgId: number, milestone: number, daysAgo: number) => {
    const id = certificates.length + 1;
    const number = `VMS-${String(id).padStart(5, '0')}`;
    certificates.push({ id, volunteer_id: volunteerId, org_id: orgId, issued_date: dateOnly(at(-daysAgo)), milestone_hours: milestone, file_path: `storage/certificates/${number}.pdf`, created_at: iso(at(-daysAgo)) });
  };
  addCert(rcVol.id, 1, 10, 62);
  addCert(rcVol.id, 1, 25, 19);
  addCert(scVol.id, 2, 10, 80);
  addCert(scVol.id, 2, 25, 28);
  for (const v of volunteers.slice(2)) {
    const orgId = users.find((u) => u.id === v.user_id)!.org_id!;
    [10, 25, 50, 100].filter((m) => v.total_hours >= m).forEach((m, i) => addCert(v.id, orgId, m, 140 - i * 30 - Math.floor(rand() * 20)));
  }

  /* ---------------- Reports ---------------- */
  const reports: ReportRow[] = [
    { id: 1, org_id: 1, generated_by: 3, period: 'Q2 2026', total_volunteers: 14, total_hours: 642.5, file_path: 'storage/reports/report_1.csv', status: 'completed', created_at: iso(at(-90)) },
    { id: 2, org_id: 1, generated_by: 2, period: 'Q3 2026', total_volunteers: 17, total_hours: 911.25, file_path: 'storage/reports/report_2.csv', status: 'completed', created_at: iso(at(-12)) },
    { id: 3, org_id: 2, generated_by: 6, period: 'Q3 2026', total_volunteers: 9, total_hours: 388, file_path: 'storage/reports/report_3.csv', status: 'completed', created_at: iso(at(-15)) },
  ];

  /* ---------------- Announcements ---------------- */
  const announcements: AnnouncementRow[] = [
    { id: 1, org_id: 1, posted_by: 3, title: 'Blood drive: bring your ID and water', message: 'Shifts at Meskel Square start at the main tent. Bring your Red Cross ID, a refillable bottle and sunscreen. Lunch is provided for shifts longer than four hours.', target_audience: 'volunteers', created_at: iso(minutesFromNow(-60 * 20)) },
    { id: 2, org_id: 1, posted_by: 2, title: 'New: certificates you can verify anywhere', message: 'Every milestone certificate now carries a public verification link. Employers and universities can confirm your hours without calling us.', target_audience: 'all', created_at: iso(at(-4)) },
    { id: 3, org_id: 1, posted_by: 3, title: 'Coordinator briefing — flood response', message: 'Kit assembly runs in three waves. Confirm crew leads by Friday and review the safety checklist with every new volunteer.', target_audience: 'coordinators', created_at: iso(at(-2)) },
    { id: 4, org_id: 1, posted_by: 8, title: 'Thank you for 900+ hours this quarter', message: 'You logged 911 verified hours in Q3. That is 1,200 donors supported and 2,000 kits on the way to Afar. አመሰግናለሁ!', target_audience: 'all', created_at: iso(at(-12)) },
    { id: 5, org_id: 2, posted_by: 6, title: 'Reading Corners need storytellers', message: 'We have 16 seats left across the next two Saturdays. Amharic readers especially welcome.', target_audience: 'volunteers', created_at: iso(at(-1)) },
    { id: 6, org_id: 3, posted_by: 10, title: 'Saturday start time moves to 7:00', message: 'Distribution opens earlier to beat the heat. Doors at 6:45.', target_audience: 'all', created_at: iso(at(-3)) },
  ];

  /* ---------------- Audit log ---------------- */
  const audit: AuditRow[] = [];
  const log = (action: string, userId: number | null, orgId: number | null, modelType: string | null, modelId: number | null, oldV: Record<string, unknown> | null, newV: Record<string, unknown> | null, minutesAgo: number) => {
    audit.push({ id: audit.length + 1, user_id: userId, org_id: orgId, action, model_type: modelType, model_id: modelId, old_values: oldV, new_values: newV, ip_address: `196.188.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}`, created_at: iso(minutesFromNow(-minutesAgo)) });
  };
  log('tenant.onboarded', 1, 4, 'App\\Models\\Organization', 4, null, { name: 'Entoto Green Corps', plan: 'free' }, 60 * 24 * 95);
  log('tenant.status_updated', 1, 5, 'App\\Models\\Organization', 5, { status: 'active', org_name: 'Lalibela Youth Network' }, { status: 'suspended', org_name: 'Lalibela Youth Network' }, 60 * 24 * 9);
  log('tenant.status_updated', 1, 3, 'App\\Models\\Organization', 3, { subscription_plan: 'free', org_name: 'Addis Food Bank Collective' }, { subscription_plan: 'pro', org_name: 'Addis Food Bank Collective' }, 60 * 24 * 30);
  log('user.coordinator_created', 2, 1, 'App\\Models\\User', 8, null, { full_name: 'Mekdes Alemayehu', role: 'Coordinator' }, 60 * 24 * 40);
  log('organization.updated', 2, 1, 'App\\Models\\Organization', 1, { phone: null }, { phone: '+251 11 515 3853' }, 60 * 24 * 14);
  log('event.updated', 3, 1, 'App\\Models\\Event', e1.id, { status: 'upcoming' }, { status: 'ongoing' }, 60 * 26);
  log('event.updated', 3, 1, 'App\\Models\\Event', e4.id, { status: 'ongoing' }, { status: 'completed' }, 60 * 24 * 19);
  log('announcement.created', 3, 1, 'App\\Models\\Announcement', 1, null, { title: 'Blood drive: bring your ID and water' }, 60 * 20);
  log('shift.urgent_broadcast', 3, 1, 'App\\Models\\Shift', s4.id, null, { event: e2.title }, 60 * 5);
  log('attendance.force_checkin', 3, 1, 'App\\Models\\Attendance', 3, null, { reason: 'Volunteer phone battery died at the gate' }, 60 * 24 * 7);
  log('volunteer.deactivated', 2, 1, 'App\\Models\\User', 22, { is_active: true }, { is_active: false }, 60 * 24 * 3);
  log('event.deleted', 6, 2, 'App\\Models\\Event', 99, { title: 'Duplicate: Kit packing' }, {}, 60 * 24 * 6);
  log('report.generated', 2, 1, 'App\\Models\\Report', 2, null, { period: 'Q3 2026', total_hours: 911.25 }, 60 * 24 * 12);
  log('tenant.onboarded', 1, 3, 'App\\Models\\Organization', 3, null, { name: 'Addis Food Bank Collective', plan: 'free' }, 60 * 24 * 200);
  audit.reverse().forEach((r, i) => (r.id = i + 1));

  /* ---------------- Documents (PENDING-BE) ---------------- */
  const documents: DocumentRow[] = [
    { id: 1, org_id: 1, volunteer_id: rcVol.id, document_type: 'certification', title: 'ERCS First Aid Certificate (2025)', file_url: '/mock-files/first-aid-certificate.svg', mime_type: 'image/svg+xml', file_size_bytes: 412_334, verification_status: 'verified', coordinator_notes: 'Valid until March 2027.', verified_by: 3, verified_at: iso(at(-30)), created_at: iso(at(-33)) },
    { id: 2, org_id: 1, volunteer_id: rcVol.id, document_type: 'id_proof', title: 'Kebele ID', file_url: '/mock-files/id-card.svg', mime_type: 'image/svg+xml', file_size_bytes: 288_120, verification_status: 'pending', coordinator_notes: null, verified_by: null, verified_at: null, created_at: iso(at(-2)) },
  ];
  volunteers.slice(2, 9).forEach((v, i) => {
    const orgId = users.find((u) => u.id === v.user_id)!.org_id!;
    documents.push({ id: documents.length + 1, org_id: orgId, volunteer_id: v.id, document_type: i % 3 === 0 ? 'medical_clearance' : 'certification', title: i % 3 === 0 ? 'Medical fitness letter' : `${v.skills[0]?.replace(/_/g, ' ')} certificate`, file_url: '/mock-files/first-aid-certificate.svg', mime_type: 'image/svg+xml', file_size_bytes: 200_000 + i * 31_000, verification_status: i < 4 ? 'pending' : 'verified', coordinator_notes: null, verified_by: i < 4 ? null : 3, verified_at: i < 4 ? null : iso(at(-5)), created_at: iso(at(-i - 1)) });
  });
  const minor = volunteers[2 + 12];
  if (minor) {
    const orgId = users.find((u) => u.id === minor.user_id)!.org_id!;
    documents.push({ id: documents.length + 1, org_id: orgId, volunteer_id: minor.id, document_type: 'parental_consent', title: 'Parental consent form', file_url: '/mock-files/consent-form.svg', mime_type: 'image/svg+xml', file_size_bytes: 156_002, verification_status: 'pending', coordinator_notes: null, verified_by: null, verified_at: null, created_at: iso(at(-1)) });
  }

  /* ---------------- Notifications (PENDING-BE) ---------------- */
  const notifications: NotificationRow[] = [
    { id: 'n-1', user_id: 4, type: 'shift_approved', title: 'You’re confirmed for the blood drive', body: `Meskel Square Blood Drive · today ${String(liveStart.getHours()).padStart(2, '0')}:${String(liveStart.getMinutes()).padStart(2, '0')}. Check in at the main tent.`, action_url: '/v/schedule', read_at: null, created_at: iso(at(-1, 18)) },
    { id: 'n-2', user_id: 4, type: 'shift_broadcast', title: 'Urgent: kit assembly needs hands', body: 'Flood Response Kit Assembly matches your skills. 11 spots left.', action_url: `/v/opportunities/${e2.id}`, read_at: null, created_at: iso(minutesFromNow(-300)) },
    { id: 'n-3', user_id: 4, type: 'certificate_issued', title: '25-hour certificate issued', body: 'Your certificate is ready to download and share.', action_url: '/v/certificates', read_at: iso(at(-18)), created_at: iso(at(-19)) },
    { id: 'n-4', user_id: 4, type: 'document_reviewed', title: 'First aid certificate verified', body: 'Mekdes verified your ERCS first aid certificate.', action_url: '/v/documents', read_at: iso(at(-29)), created_at: iso(at(-30)) },
    { id: 'n-5', user_id: 3, type: 'announcement', title: '9 applications waiting', body: 'Flood Response Kit Assembly and First Aid Training have new applicants.', action_url: '/c/applications', read_at: null, created_at: iso(minutesFromNow(-90)) },
    { id: 'n-6', user_id: 2, type: 'announcement', title: 'Q3 impact report is ready', body: '911 verified hours from 17 volunteers.', action_url: '/o/reports', read_at: null, created_at: iso(at(-12)) },
    { id: 'n-7', user_id: 1, type: 'announcement', title: 'Lalibela Youth Network suspended', body: 'Their admins were notified and sessions revoked.', action_url: '/p/organizations/5', read_at: null, created_at: iso(at(-9)) },
  ];

  return {
    organizations,
    users,
    volunteers,
    events,
    shifts,
    assignments,
    attendances,
    certificates,
    reports,
    announcements,
    audit,
    documents,
    notifications,
    chat: {},
    tokens: {},
  };
}
