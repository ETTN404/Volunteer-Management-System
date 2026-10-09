import {
  Organization,
  User,
  Volunteer,
  Event,
  Shift,
  ShiftAssignment,
  Attendance,
  Certificate,
  Report,
  Announcement,
  AuditLog,
} from '../types/vms';

const STORAGE_KEY = 'voluntrack_vms_database_v2';

export interface VmsDatabase {
  organizations: Organization[];
  users: User[];
  volunteers: Volunteer[];
  events: Event[];
  shifts: Shift[];
  shiftAssignments: ShiftAssignment[];
  attendances: Attendance[];
  certificates: Certificate[];
  reports: Report[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}

export const INITIAL_SEED_DATA: VmsDatabase = {
  organizations: [
    {
      id: 1,
      name: 'Hope Food Relief Network',
      slug: 'hope-food-relief',
      email: 'contact@hopefood.org',
      phone: '+1 (555) 234-5678',
      website: 'https://hopefood.org',
      logo_path: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      subscription_plan: 'enterprise',
      geofence_default_radius: 100,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-08-01T10:00:00Z',
      total_volunteers: 142,
      total_hours: 1850,
    },
    {
      id: 2,
      name: 'Green Earth Conservation Alliance',
      slug: 'green-earth-alliance',
      email: 'hello@greenearth.org',
      phone: '+1 (555) 876-5432',
      website: 'https://greenearth.org',
      logo_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      subscription_plan: 'pro',
      geofence_default_radius: 150,
      created_at: '2026-02-10T09:30:00Z',
      updated_at: '2026-07-20T14:15:00Z',
      total_volunteers: 86,
      total_hours: 920,
    },
    {
      id: 3,
      name: 'Sunrise Youth Initiative (Suspended)',
      slug: 'sunrise-youth',
      email: 'admin@sunriseyouth.org',
      phone: '+1 (555) 444-9988',
      website: 'https://sunriseyouth.org',
      logo_path: '',
      status: 'suspended',
      subscription_plan: 'free',
      geofence_default_radius: 100,
      created_at: '2026-03-01T11:00:00Z',
      updated_at: '2026-07-29T16:00:00Z',
      total_volunteers: 12,
      total_hours: 45,
    },
  ],

  users: [
    {
      id: 1,
      org_id: null,
      name: 'Elena Vance',
      email: 'superadmin@vms-platform.io',
      role: 'SuperAdmin',
      phone: '+1 (555) 000-1111',
      profile_photo_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 2,
      org_id: 1,
      name: 'Marcus Reed',
      email: 'marcus.admin@hopefood.org',
      role: 'OrgAdmin',
      phone: '+1 (555) 234-5679',
      profile_photo_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-01-15T08:30:00Z',
      updated_at: '2026-08-01T10:00:00Z',
    },
    {
      id: 3,
      org_id: 1,
      name: 'Sarah Jenkins',
      email: 'sarah.coordinator@hopefood.org',
      role: 'Coordinator',
      phone: '+1 (555) 234-5680',
      profile_photo_path: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-01-20T09:00:00Z',
      updated_at: '2026-08-10T12:00:00Z',
    },
    {
      id: 4,
      org_id: 1,
      name: 'Alex Rivera',
      email: 'alex.rivera@volunteer.me',
      role: 'Volunteer',
      phone: '+1 (555) 321-7654',
      profile_photo_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-02-01T14:00:00Z',
      updated_at: '2026-08-25T11:00:00Z',
    },
    {
      id: 5,
      org_id: 1,
      name: 'Maya Chen',
      email: 'maya.chen@volunteer.me',
      role: 'Volunteer',
      phone: '+1 (555) 654-9870',
      profile_photo_path: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-02-15T10:00:00Z',
      updated_at: '2026-08-20T15:00:00Z',
    },
    {
      id: 6,
      org_id: 2,
      name: 'Liam Thorne',
      email: 'liam.coord@greenearth.org',
      role: 'Coordinator',
      phone: '+1 (555) 876-5433',
      profile_photo_path: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
      is_active: true,
      created_at: '2026-02-12T11:00:00Z',
      updated_at: '2026-08-05T09:00:00Z',
    },
  ],

  volunteers: [
    {
      id: 1,
      user_id: 4, // Alex Rivera
      skills: ['Food Prep', 'Logistics', 'First Aid', 'Driver License', 'Inventory Management'],
      bio: 'Dedicated community volunteer passionate about fighting food insecurity and organizing emergency supplies distribution.',
      emergency_contact: 'Maria Rivera (+1 555-987-1234)',
      availability: ['Weekends', 'Friday Evenings', 'Morning Shifts'],
      total_hours: 48.0, // Close to 50h milestone!
      impact_score: 84.5,
      attendance_rate: 96,
      created_at: '2026-02-01T14:05:00Z',
      updated_at: '2026-08-25T11:00:00Z',
    },
    {
      id: 2,
      user_id: 5, // Maya Chen
      skills: ['Food Prep', 'Public Speaking', 'Translation (Spanish)', 'First Aid'],
      bio: 'Passionate about public health, community pantry outreach, and multi-lingual volunteer coordination.',
      emergency_contact: 'David Chen (+1 555-876-1122)',
      availability: ['Saturday Mornings', 'Sunday Afternoons'],
      total_hours: 32.5,
      impact_score: 72.0,
      attendance_rate: 92,
      created_at: '2026-02-15T10:10:00Z',
      updated_at: '2026-08-20T15:00:00Z',
    },
  ],

  events: [
    {
      id: 1,
      org_id: 1,
      title: 'Metro Food Bank Weekend Drive',
      description: 'Mass packaging and neighborhood distribution of fresh produce and dry goods to over 450 local families in need.',
      category: 'Food Distribution',
      venue_name: 'Hope Center Warehouse 4B',
      venue_address: '742 Evergreen Blvd, Metro City, CA 94103',
      latitude: 37.774929,
      longitude: -122.419416,
      geofence_radius: 100, // 100 meters Haversine radius
      start_date: '2026-08-29',
      end_date: '2026-08-30',
      status: 'upcoming',
      image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&auto=format&fit=crop&q=80',
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T10:00:00Z',
    },
    {
      id: 2,
      org_id: 1,
      title: 'Senior Community Nutrition Meal Prep',
      description: 'Hot meal batch preparation, hygienic packaging, and door-to-door delivery route dispatch for homebound elderly residents.',
      category: 'Elderly Care',
      venue_name: 'Community Kitchen Hub',
      venue_address: '1200 Market Street, Suite 100, Metro City, CA 94102',
      latitude: 37.779144,
      longitude: -122.413725,
      geofence_radius: 120,
      start_date: '2026-08-31',
      end_date: '2026-08-31',
      status: 'upcoming',
      image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
      created_at: '2026-08-12T14:30:00Z',
      updated_at: '2026-08-12T14:30:00Z',
    },
    {
      id: 3,
      org_id: 2,
      title: 'Coastal Pine Forest Reforestation',
      description: 'Planting native Douglas fir saplings, clearing invasive ivy, and constructing erosion barrier fences.',
      category: 'Environmental',
      venue_name: 'Presidio Coastal Nature Reserve',
      venue_address: '1500 Coastal Highway, Bay Area, CA 94129',
      latitude: 37.7989,
      longitude: -122.4662,
      geofence_radius: 200,
      start_date: '2026-09-05',
      end_date: '2026-09-06',
      status: 'upcoming',
      image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
      created_at: '2026-08-14T09:00:00Z',
      updated_at: '2026-08-14T09:00:00Z',
    },
    {
      id: 4,
      org_id: 1,
      title: 'Emergency Flood Relief Care Package Packing',
      description: 'Rapid assembly of hygiene kits, water purification tablets, and non-perishable rations for storm-affected districts.',
      category: 'Disaster Relief',
      venue_name: 'Hope Logistics Hub North',
      venue_address: '500 Logistics Way, Dock 12, Metro City, CA 94107',
      latitude: 37.7651,
      longitude: -122.3921,
      geofence_radius: 100,
      start_date: '2026-08-20',
      end_date: '2026-08-21',
      status: 'completed',
      image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
      created_at: '2026-08-01T08:00:00Z',
      updated_at: '2026-08-22T18:00:00Z',
    },
  ],

  shifts: [
    {
      id: 1,
      event_id: 1,
      title: 'Morning Sorting & Warehouse Packaging',
      description: 'Unload delivery trucks, inspect produce quality, package 5kg family boxes.',
      start_time: '2026-08-29 08:30:00',
      end_time: '2026-08-29 12:30:00',
      capacity: 12,
      required_skills: ['Food Prep', 'Logistics', 'First Aid'],
      qr_code_signature: 'QR_SIG_8F93A04B11E7',
      qr_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_urgent: false,
      created_at: '2026-08-10T10:15:00Z',
      updated_at: '2026-08-28T08:00:00Z',
    },
    {
      id: 2,
      event_id: 1,
      title: 'Afternoon Distribution & Drive-thru Handout',
      description: 'Operate contactless drive-thru lanes, load boxes into recipient vehicles.',
      start_time: '2026-08-29 13:00:00',
      end_time: '2026-08-29 17:00:00',
      capacity: 8,
      required_skills: ['Logistics', 'Driver License'],
      qr_code_signature: 'QR_SIG_3A19C48D90B2',
      qr_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_urgent: true,
      created_at: '2026-08-10T10:20:00Z',
      updated_at: '2026-08-28T10:00:00Z',
    },
    {
      id: 3,
      event_id: 2,
      title: 'Kitchen Prep & Hygienic Packaging',
      description: 'Chop vegetables, assist chef with large kettle preparation, seal insulated meal containers.',
      start_time: '2026-08-31 09:00:00',
      end_time: '2026-08-31 13:00:00',
      capacity: 6,
      required_skills: ['Food Prep', 'First Aid'],
      qr_code_signature: 'QR_SIG_5E71B209F44A',
      qr_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      is_urgent: false,
      created_at: '2026-08-12T14:40:00Z',
      updated_at: '2026-08-12T14:40:00Z',
    },
    {
      id: 4,
      event_id: 4,
      title: 'Rapid Response Hygiene Kit Packing',
      description: 'Completed shift for flood relief assembly.',
      start_time: '2026-08-20 09:00:00',
      end_time: '2026-08-20 13:00:00',
      capacity: 10,
      required_skills: ['Logistics'],
      qr_code_signature: 'QR_SIG_PAST_7718A9',
      qr_expires_at: '2026-08-20T13:30:00Z',
      is_urgent: false,
      created_at: '2026-08-01T08:30:00Z',
      updated_at: '2026-08-20T13:00:00Z',
    },
  ],

  shiftAssignments: [
    {
      id: 1,
      shift_id: 1,
      volunteer_id: 1, // Alex Rivera
      status: 'approved',
      applied_at: '2026-08-15T11:20:00Z',
      match_score: 100,
      coordinator_feedback: 'Approved based on stellar attendance record and required First Aid certification.',
    },
    {
      id: 2,
      shift_id: 2,
      volunteer_id: 2, // Maya Chen
      status: 'applied',
      applied_at: '2026-08-27T09:15:00Z',
      match_score: 50,
      coordinator_feedback: 'Missing Driver License requirement. Pending coordinator review for non-driving role.',
    },
    {
      id: 3,
      shift_id: 4,
      volunteer_id: 1,
      status: 'completed',
      applied_at: '2026-08-02T10:00:00Z',
      match_score: 100,
      coordinator_feedback: 'Verified 4.0 hours with full on-time check-in.',
    },
  ],

  attendances: [
    {
      id: 1,
      shift_id: 4,
      volunteer_id: 1,
      check_in_time: '2026-08-20 08:52:00',
      check_out_time: '2026-08-20 12:55:00',
      verified_hours: 4.0,
      check_in_lat: 37.76512,
      check_in_lon: -122.39215,
      distance_from_venue_meters: 6.2,
      is_within_geofence: true,
      signature_path: '/storage/signatures/att_1_sig.png',
      signature_preview: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M10,25 Q30,5 50,25 T90,20" stroke="%2338bdf8" fill="none" stroke-width="2"/></svg>',
      verification_method: 'qr_geofence',
      created_at: '2026-08-20T08:52:00Z',
      updated_at: '2026-08-20T12:55:00Z',
    },
  ],

  certificates: [
    {
      id: 1,
      org_id: 1,
      volunteer_id: 1,
      certificate_number: 'VMS-10HR-849201',
      title: '10 Hours Community Service Milestone',
      milestone_hours: 10,
      issued_date: '2026-03-10',
      signatory_name: 'Marcus Reed',
      signatory_title: 'Executive Director, Hope Food Relief',
      download_url: '#download-cert-1',
      pdf_generated: true,
      created_at: '2026-03-10T15:00:00Z',
    },
    {
      id: 2,
      org_id: 1,
      volunteer_id: 1,
      certificate_number: 'VMS-25HR-992140',
      title: '25 Hours Dedicated Service Milestone',
      milestone_hours: 25,
      issued_date: '2026-05-18',
      signatory_name: 'Marcus Reed',
      signatory_title: 'Executive Director, Hope Food Relief',
      download_url: '#download-cert-2',
      pdf_generated: true,
      created_at: '2026-05-18T16:30:00Z',
    },
  ],

  reports: [
    {
      id: 1,
      org_id: 1,
      generated_by: 2,
      report_type: 'impact_summary',
      title: 'Q2 2026 Cumulative Impact & Volunteer Output Report',
      period: '2026-Q2',
      status: 'completed',
      file_path: '/storage/reports/report_q2_2026_hopefood.csv',
      records_count: 142,
      created_at: '2026-07-01T09:00:00Z',
      completed_at: '2026-07-01T09:01:15Z',
      data_preview: [
        { metric: 'Total Volunteer Hours', value: '1,850.0 hrs' },
        { metric: 'Verified Check-Ins', value: '412 shifts' },
        { metric: 'Average Impact Score', value: '81.4 / 100' },
        { metric: 'Certificates Auto-Issued', value: '38 milestones' },
      ],
    },
  ],

  announcements: [
    {
      id: 1,
      org_id: 1,
      author_id: 3,
      author_name: 'Sarah Jenkins (Coordinator)',
      title: 'URGENT: 4 Drivers Needed for Saturday Morning Food Box Route',
      content: 'We have experienced an influx of 120 extra food box requests for homebound seniors this weekend. If you hold a valid Driver License and are free from 13:00 to 17:00, please apply immediately via Shift #2!',
      target_audience: 'volunteers',
      is_urgent: true,
      shift_id: 2,
      is_read: false,
      created_at: '2026-08-28T09:30:00Z',
    },
    {
      id: 2,
      org_id: 1,
      author_id: 2,
      author_name: 'Marcus Reed (OrgAdmin)',
      title: 'New Safety & Geofence Check-in Protocol Updates',
      content: 'Please ensure your smartphone location permissions are enabled before arriving at the warehouse. The automatic GPS check-in window opens 15 minutes before your shift start time.',
      target_audience: 'all',
      is_urgent: false,
      is_read: true,
      created_at: '2026-08-25T14:00:00Z',
    },
  ],

  auditLogs: [
    {
      id: 1,
      user_id: 3,
      user_name: 'Sarah Jenkins',
      org_id: 1,
      org_name: 'Hope Food Relief Network',
      action: 'application.approved',
      model_type: 'ShiftAssignment',
      model_id: 1,
      old_values: { status: 'applied' },
      new_values: { status: 'approved', feedback: 'Verified First Aid credentials' },
      ip_address: '198.51.100.42',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      created_at: '2026-08-15T11:25:00Z',
    },
    {
      id: 2,
      user_id: 4,
      user_name: 'Alex Rivera',
      org_id: 1,
      org_name: 'Hope Food Relief Network',
      action: 'attendance.qr_checkin',
      model_type: 'Attendance',
      model_id: 1,
      old_values: null,
      new_values: { shift_id: 4, distance_meters: 6.2, method: 'qr_geofence' },
      ip_address: '172.56.21.90',
      user_agent: 'Mobile Safari 17.4',
      created_at: '2026-08-20T08:52:00Z',
    },
    {
      id: 3,
      user_id: 1,
      user_name: 'Elena Vance (SuperAdmin)',
      org_id: 3,
      org_name: 'Sunrise Youth Initiative',
      action: 'tenant.suspended',
      model_type: 'Organization',
      model_id: 3,
      old_values: { status: 'active' },
      new_values: { status: 'suspended', reason: 'Annual compliance review required' },
      ip_address: '203.0.113.15',
      user_agent: 'Chrome 128.0 (Windows)',
      created_at: '2026-07-29T16:00:00Z',
    },
  ],
};

export class VmsStore {
  private static db: VmsDatabase = this.load();

  private static normalizeDatabase(data: VmsDatabase): VmsDatabase {
    if (!data) return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));

    // Normalize organizations
    if (!data.organizations) data.organizations = [];
    data.organizations = data.organizations.map((org) => ({
      ...org,
      subdomain: org.subdomain || org.slug || `org-${org.id}`,
      geofence_default_radius: org.geofence_default_radius || 100,
      settings: org.settings || {
        geofence_default_radius: org.geofence_default_radius || 100,
        enable_ai_matching: true,
        enable_qr_rotation: true,
        enable_milestone_certs: true,
      },
    }));

    // Normalize users
    if (!data.users) data.users = [];
    data.users = data.users.map((u) => ({
      ...u,
      organization_id: u.organization_id || u.org_id || 1,
      org_id: u.org_id || u.organization_id || 1,
    }));

    // Normalize events
    if (!data.events) data.events = [];
    data.events = data.events.map((e) => ({
      ...e,
      organization_id: e.organization_id || e.org_id || 1,
      org_id: e.org_id || e.organization_id || 1,
    }));

    if (!data.volunteers) data.volunteers = [];
    if (!data.shifts) data.shifts = [];
    if (!data.shiftAssignments) data.shiftAssignments = [];
    if (!data.attendances) data.attendances = [];
    if (!data.certificates) data.certificates = [];
    if (!data.reports) data.reports = [];
    if (!data.announcements) data.announcements = [];
    if (!data.auditLogs) data.auditLogs = [];

    return data;
  }

  private static load(): VmsDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.normalizeDatabase(parsed);
      }
    } catch (e) {
      console.warn('Failed to parse stored VMS DB, loading seed data', e);
    }
    const seed = this.normalizeDatabase(JSON.parse(JSON.stringify(INITIAL_SEED_DATA)));
    this.save(seed);
    return seed;
  }

  public static save(database: VmsDatabase = this.db): void {
    this.db = database;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch (e) {
      console.error('Failed to persist VMS DB', e);
    }
  }

  public static get(): VmsDatabase {
    return this.db;
  }

  public static resetToSeedData(): VmsDatabase {
    this.db = this.normalizeDatabase(JSON.parse(JSON.stringify(INITIAL_SEED_DATA)));
    this.save(this.db);
    return this.db;
  }

  public static logAudit(params: {
    userId?: number;
    userName?: string;
    orgId?: number;
    orgName?: string;
    action: string;
    modelType?: string;
    modelId?: number;
    oldValues?: any;
    newValues?: any;
  }): AuditLog {
    const newLog: AuditLog = {
      id: Date.now(),
      user_id: params.userId,
      user_name: params.userName,
      org_id: params.orgId,
      org_name: params.orgName,
      action: params.action,
      model_type: params.modelType,
      model_id: params.modelId,
      old_values: params.oldValues,
      new_values: params.newValues,
      ip_address: '127.0.0.1',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    };

    this.db.auditLogs.unshift(newLog);
    this.save();
    return newLog;
  }
}
