/**
 * Wire types mirroring app/Http/Resources/*.php exactly.
 * Fields marked `PENDING-BE` are not yet returned by Laravel; the mock backend provides them
 * and the UI must treat them as optional. See docs/PENDING_BACKEND_CONTRACTS.md.
 */

export type Role = 'SuperAdmin' | 'OrgAdmin' | 'Coordinator' | 'Volunteer';

export interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface Organization {
  id: number;
  name: string;
  email: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  status: 'active' | 'suspended' | 'inactive';
  subscription_plan: string | null;
  logo_url: string | null;
  created_at: string;
  /** PENDING-BE (G20) */
  primary_color?: string | null;
  /** PENDING-BE (G20) */
  subdomain?: string | null;
}

export interface User {
  id: number;
  org_id: number | null;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  profile_photo_url: string | null;
  last_login: string | null;
  created_at: string;
  volunteer?: Volunteer;
  organization?: Organization;
}

export type SkillVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Volunteer {
  id: number;
  skills: string[];
  /** List of slot keys, or the seeder's `{ weekends: true }` object form — use normalizeAvailability(). */
  availability: string[] | Record<string, boolean>;
  bio: string | null;
  total_hours: number;
  impact_score: number;
  created_at: string;
  user?: User;
  /** PENDING-BE (G5) */
  date_of_birth?: string | null;
  /** PENDING-BE (G5) */
  is_minor?: boolean;
  /** PENDING-BE (G5) */
  parental_consent_verified?: boolean;
  /** PENDING-BE (G7) */
  skills_verification?: Record<string, SkillVerificationStatus>;
}

export interface Reliability {
  attendance_rate: number;
  on_time_rate: number;
  total_confirmed_shifts: number;
  total_attended_shifts?: number;
}

export type SkillsAlignment = Record<string, number>;

export interface VolunteerProfile {
  volunteer: Volunteer;
  reliability: Reliability;
  skills_alignment: SkillsAlignment;
}

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface VmsEvent {
  id: number;
  org_id: number;
  title: string;
  description: string | null;
  location: string;
  coordinates: { latitude: number | null; longitude: number | null };
  geofence_radius: number;
  start_date: string;
  end_date: string;
  status: EventStatus;
  created_at: string;
  shifts?: Shift[];
  match_score?: number;
}

export interface Shift {
  id: number;
  event_id: number;
  start_time: string;
  end_time: string;
  required_skills: string[];
  capacity: number;
  qr_expires_at: string | null;
  created_at: string;
  event?: VmsEvent;
  match_score?: number;
  /** PENDING-BE (G8) — confirmed assignments count, for capacity meters */
  confirmed_count?: number;
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface ShiftAssignment {
  id: number;
  shift_id: number;
  volunteer_id: number;
  status: AssignmentStatus;
  applied_at: string;
  shift?: Shift;
  volunteer?: Volunteer;
  /** PENDING-BE (G15) */
  decline_reason?: string | null;
}

export interface Attendance {
  id: number;
  shift_id: number;
  volunteer_id: number;
  check_in_time: string;
  check_out_time: string | null;
  qr_verified: boolean;
  created_at: string;
  shift?: Shift;
  /** PENDING-BE (G14) */
  hours_status?: 'pending' | 'verified' | 'adjusted' | 'rejected';
  /** PENDING-BE (G14) */
  verified_hours?: number | null;
}

export interface Certificate {
  id: number;
  volunteer_id: number;
  org_id: number;
  issued_date: string;
  milestone_hours: number;
  download_url: string;
  created_at: string;
}

export interface CertificateVerification {
  certificate_number: string;
  volunteer_name: string;
  organization_name: string;
  milestone_hours: number;
  issued_date: string;
  verified_at: string;
}

export interface Report {
  id: number;
  org_id: number;
  generated_by: number;
  period: string;
  total_volunteers: number;
  total_hours: number;
  status: string;
  download_url: string | null;
  created_at: string;
}

export type Audience = 'all' | 'volunteers' | 'coordinators';

export interface Announcement {
  id: number;
  org_id: number;
  posted_by: number;
  title: string;
  message: string;
  target_audience: Audience;
  created_at: string;
  poster?: { id: number; full_name: string };
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  org_id: number | null;
  action: string;
  model_type: string | null;
  model_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export interface ImpactBreakdown {
  total_hours: number;
  impact_score: number;
  completed_shifts_count: number;
  next_milestone: number | null;
  hours_to_next: number;
  earned_certificates: number;
}

export interface CheckOutResult {
  check_in: string;
  check_out: string;
  hours_logged: number;
  cumulative_hours: number;
  impact_score: number;
  milestones_reached: number[];
}

export interface ShiftCapacity {
  shift_id: number;
  total_capacity: number;
  confirmed_count: number;
  remaining_slots: number;
  is_full: boolean;
}

export interface PlatformMetrics {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_volunteers: number;
  total_coordinators: number;
}

export interface OrganizationDetail {
  organization: Organization;
  user_count: number;
  event_count: number;
}

export interface AiFeedback {
  assignment_id: string | number;
  missing_skills: string[];
  ai_drafted_feedback: string;
}

export interface ChatReply {
  status: 'success';
  bot_name: string;
  query: string;
  response: string;
  timestamp: string;
}

export interface QrCode {
  qr_code_signature: string;
  expires_at: string;
}

/* ---------------- PENDING-BE entities ---------------- */

export type DocumentType = 'certification' | 'id_proof' | 'parental_consent' | 'medical_clearance';

export interface VolunteerDocument {
  id: number;
  volunteer_id: number;
  document_type: DocumentType;
  title: string;
  file_url: string;
  mime_type: string;
  file_size_bytes: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  coordinator_notes: string | null;
  verified_at: string | null;
  created_at: string;
  volunteer?: Volunteer;
}

export interface AppNotification {
  id: string;
  type: 'shift_approved' | 'shift_broadcast' | 'certificate_issued' | 'organization_suspended' | 'announcement' | 'document_reviewed';
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PublicOrganization {
  id: number;
  name: string;
  logo_url: string | null;
  address: string | null;
  volunteer_count: number;
}

export interface PublicStats {
  organizations: number;
  volunteers: number;
  verified_hours: number;
  certificates_issued: number;
  shifts_completed: number;
}

export interface ImpactHistoryPoint {
  month: string;
  hours: number;
  shifts: number;
  impact_score: number;
}

export interface CoordinatorDashboard {
  shifts_today: number;
  /** null when the server can't report it yet */
  checked_in_now: number | null;
  pending_applications: number;
  underfilled_shifts: number;
  hours_this_month: number | null;
  active_volunteers: number;
}

export interface OrgAnalytics {
  volunteers: number;
  active_volunteers: number;
  coordinators: number;
  events: number;
  upcoming_events: number;
  total_hours: number;
  hours_by_month: { month: string; hours: number }[];
  top_skills: { skill: string; count: number }[];
}

export interface RosterEntry {
  assignment_id: number;
  volunteer: Volunteer;
  status: AssignmentStatus;
  attendance: Attendance | null;
}

export interface TimeseriesPoint {
  date: string;
  organizations: number;
  users: number;
  hours: number;
}
