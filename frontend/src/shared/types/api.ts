/**
 * Wire types mirroring app/Http/Resources/*.php and the controllers' JSON exactly.
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
  status: OrgStatus;
  subscription_plan: PlanKey | null;
  logo_url: string | null;
  created_at: string;
  country?: string | null;
  city?: string | null;
  primary_color?: string | null;
  subdomain?: string | null;
  verification_status?: 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  plan_expires_at?: string | null;
  effective_plan?: PlanKey;
  settings?: { attendance: AttendancePolicy };
  billing?: BillingSnapshot;
}

export type OrgStatus = 'active' | 'suspended' | 'inactive';
export type PlanKey = 'free' | 'pro' | 'enterprise';

export interface AttendancePolicy {
  checkin_before_minutes: number;
  checkin_after_minutes: number;
  qr_window_seconds: number;
  early_checkout_minutes: number;
  undo_checkout_minutes: number;
  auto_checkout_grace: number;
  max_gps_accuracy: number;
  ping_interval_minutes: number;
  require_qr: boolean;
  auto_verify_hours: boolean;
}

export type LimitKey = 'coordinators' | 'active_events' | 'shifts_per_event' | 'volunteers' | 'broadcasts_per_month' | 'storage_mb';

export interface BillingSnapshot {
  plan: PlanKey;
  plan_name: string;
  subscribed_plan: PlanKey;
  plan_expires_at: string | null;
  features: string[];
  limits: Record<LimitKey, { used: number; limit: number | null }>;
}

export interface User {
  id: number;
  org_id: number | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  must_change_password?: boolean;
  email_verified_at?: string | null;
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
  date_of_birth?: string | null;
  is_minor?: boolean;
  parental_consent_verified?: boolean;
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
  organization?: EventOrganization | null;
}

export interface EventOrganization {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  city: string | null;
  country: string | null;
  verification_status?: string;
}

export interface Shift {
  id: number;
  event_id: number;
  title?: string | null;
  notes?: string | null;
  start_time: string;
  end_time: string;
  required_skills: string[];
  capacity: number;
  qr_expires_at: string | null;
  created_at: string;
  event?: VmsEvent;
  match_score?: number;
  confirmed_count?: number;
  pending_count?: number;
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'removed';

export interface ShiftAssignment {
  id: number;
  shift_id: number;
  volunteer_id: number;
  status: AssignmentStatus;
  applied_at: string;
  shift?: Shift;
  volunteer?: Volunteer;
  decline_reason?: string | null;
  match_score?: number | null;
  /** Volunteer's own attendance on this shift (schedule endpoint only). */
  attendance?: Attendance | null;
}

export type HoursStatus = 'pending' | 'verified' | 'adjusted' | 'rejected';

export type AttendanceFlag =
  | 'left_early'
  | 'auto_checked_out'
  | 'checked_out_off_site'
  | 'left_venue_during_shift'
  | 'low_presence'
  | 'shared_device'
  | 'resumed'
  | 'reopened_by_staff'
  | 'manual_check_in'
  | 'id_checked'
  | 'no_venue_coordinates';

export interface Attendance {
  id: number;
  shift_id: number;
  volunteer_id: number;
  check_in_time: string;
  check_out_time: string | null;
  qr_verified: boolean;
  created_at: string;
  shift?: Shift;
  check_in_method?: 'self' | 'manual';
  check_out_method?: 'self' | 'manual' | 'auto' | null;
  check_out_reason?: string | null;
  hours?: number;
  hours_status?: HoursStatus;
  verified_hours?: number | null;
  verified_at?: string | null;
  verification_note?: string | null;
  flags?: AttendanceFlag[];
  presence?: { pings: number; inside: number; last_ping_at: string | null };
  can_resume?: boolean;
}

export interface Certificate {
  id: number;
  certificate_number?: string;
  organization_name?: string | null;
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
  period_start?: string | null;
  period_end?: string | null;
  summary?: ReportSummary | null;
  total_volunteers: number;
  total_hours: number;
  status: string;
  download_url: string | null;
  created_at: string;
}

export interface ReportSummary {
  period_start: string;
  period_end: string;
  volunteers: number;
  new_volunteers: number;
  verified_hours: number;
  pending_hours: number;
  shifts_worked: number;
  attendances: number;
  attendance_rate: number | null;
  events: number;
  by_event: {
    event_id: number;
    title: string;
    status: string;
    start_date: string;
    shifts: number;
    places: number;
    confirmed: number;
    volunteers: number;
    verified_hours: number;
    pending_hours: number;
  }[];
  by_month: { month: string; hours: number }[];
  top_volunteers: { volunteer: string; hours: number; shifts: number }[];
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
  poster?: { id: number; full_name: string } | null;
  organization?: { id: number; name: string; logo_url: string | null } | null;
  kind?: 'general' | 'urgent';
  shift_id?: number | null;
  recipients_count?: number;
  is_read?: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  org_id: number | null;
  action: string;
  action_label?: string;
  actor?: { id: number; name: string; email: string; role: Role } | null;
  organization?: string | null;
  target_type?: string | null;
  target_label?: string | null;
  changes?: { field: string; from: string; to: string }[];
  user_agent?: string | null;
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
  pending_hours?: number;
  organizations_helped?: number;
  next_milestone: number | null;
  hours_to_next: number;
  earned_certificates: number;
}

export interface CheckOutResult extends Attendance {
  check_in: string;
  check_out: string;
  hours_logged: number;
  cumulative_hours: number;
  impact_score: number;
  milestones_reached?: number[];
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
  pending_verification?: number;
  verified_hours?: number;
  pending_payments?: number;
  revenue_this_month?: number;
  open_reports?: number;
  plans?: Record<string, number>;
}

export interface OrganizationDetail {
  organization: Organization;
  user_count: number;
  event_count: number;
  billing?: BillingSnapshot;
  admins?: User[];
  documents?: OrganizationDocument[];
  payments?: Payment[];
  reports?: OrgReport[];
  stats?: { volunteers: number; verified_hours: number; last_activity: string | null };
}

export type OrgDocumentType = 'registration_certificate' | 'tax_certificate' | 'operating_license' | 'other';

export interface OrganizationDocument {
  id: number;
  org_id: number;
  document_type: OrgDocumentType;
  title: string;
  file_url: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  status: 'pending' | 'verified' | 'rejected';
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  org_id: number;
  organization: { id: number; name: string } | null;
  plan: PlanKey;
  months: number;
  amount: number;
  currency: string;
  method: string;
  transaction_ref: string;
  payer_name: string | null;
  payer_account_suffix: string | null;
  status: 'pending' | 'verified' | 'rejected';
  verification_source: string;
  verification_note: string | null;
  receipt: { verified: boolean; amount: number | null; receiver_name: string | null; receiver_account: string | null; date: string | null } | null;
  notes: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type OrgReportCategory = 'fraud_or_scam' | 'unsafe_conditions' | 'harassment' | 'misleading_event' | 'payment_requested' | 'other';

export interface OrgReport {
  id: number;
  org_id: number;
  organization: { id: number; name: string; status: OrgStatus } | null;
  event: { id: number; title: string | null } | null;
  reporter: { id: number; name: string; email: string } | null;
  category: OrgReportCategory;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface SupportMessage {
  id: number;
  side: 'platform' | 'org';
  author: { id: number; name: string; role: Role } | null;
  body: string;
  mine: boolean;
  created_at: string;
}

export interface SupportThread {
  id: number;
  org_id: number;
  organization: { id: number; name: string };
  subject: string;
  status: 'open' | 'closed';
  started_by: 'platform' | 'org';
  unread: boolean;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  messages?: SupportMessage[];
}

export interface Invitation {
  invite_url: string;
  email_sent: boolean;
  expires_at: string;
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
  data?: { token: string; period_seconds: number; rotates_at: string; valid_until: string };
}

/* ---------------- PENDING-BE entities ---------------- */

export type DocumentType = 'certification' | 'id_proof' | 'parental_consent' | 'medical_clearance' | 'other';

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
  type: string;
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
  city?: string | null;
  country?: string | null;
  volunteer_count: number;
}

export interface OrganizationProfile {
  id: number;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  website: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  verified: boolean;
  member_since: string;
  stats: { active_events: number; past_events: number; volunteers: number; verified_hours: number };
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
  pending_hours?: number;
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
  hours_to_verify?: number;
  left_early_today?: number;
  active_volunteers: number;
}

export interface OrgAnalytics {
  volunteers: number;
  active_volunteers: number;
  coordinators: number;
  events: number;
  upcoming_events: number;
  total_hours: number;
  pending_hours?: number;
  fill_rate?: number | null;
  no_show_rate?: number | null;
  advanced?: boolean;
  hours_by_month: { month: string; hours: number; volunteers?: number; shifts?: number }[];
  top_skills: { skill: string; count: number }[];
}

export interface RosterEntry {
  assignment_id: number;
  volunteer: Volunteer;
  status: AssignmentStatus;
  attendance: Attendance | null;
}

export interface RosterMeta {
  shift: Shift & { event: { id: number; title: string; location: string; geofence_radius: number } };
  capacity: number;
  confirmed: number;
  checked_in: number;
  checked_out: number;
  left_early: number;
  open_places: number;
  policy: AttendancePolicy;
}

export interface TimeseriesPoint {
  date: string;
  organizations: number;
  users: number;
  new_users?: number;
  hours: number;
  verified_hours?: number;
  revenue?: number;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  price_monthly: number;
  limits: Record<LimitKey, number | null>;
  features: string[];
}
