/** Row shapes of the mock database — mirror the Laravel tables (not the API resources). */
import type { AppNotification, Audience, DocumentType, Role, SkillVerificationStatus } from '@/shared/types/api';

export interface OrganizationRow {
  id: number;
  name: string;
  email: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  logo_path: string | null;
  status: 'active' | 'suspended' | 'inactive';
  subscription_plan: string;
  primary_color: string | null;
  subdomain: string | null;
  created_at: string;
}

export interface UserRow {
  id: number;
  org_id: number | null;
  full_name: string;
  email: string;
  password: string;
  role: Role;
  is_active: boolean;
  profile_photo_path: string | null;
  last_login: string | null;
  created_at: string;
}

export interface VolunteerRow {
  id: number;
  user_id: number;
  skills: string[];
  availability: string[] | Record<string, boolean>;
  total_hours: number;
  impact_score: number;
  bio: string | null;
  date_of_birth: string | null;
  parental_consent_verified: boolean;
  skills_verification: Record<string, SkillVerificationStatus>;
  created_at: string;
}

export interface EventRow {
  id: number;
  org_id: number;
  title: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  geofence_radius: number;
  created_at: string;
}

export interface ShiftRow {
  id: number;
  event_id: number;
  start_time: string;
  end_time: string;
  required_skills: string[];
  capacity: number;
  qr_code_signature: string;
  qr_expires_at: string | null;
  created_at: string;
}

export interface AssignmentRow {
  id: number;
  shift_id: number;
  volunteer_id: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'removed';
  assigned_at: string | null;
  decline_reason: string | null;
  created_at: string;
}

export interface AttendanceRow {
  id: number;
  shift_id: number;
  volunteer_id: number;
  check_in_time: string;
  check_out_time: string | null;
  qr_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  signature_data: string | null;
  hours_status: 'pending' | 'verified' | 'adjusted' | 'rejected';
  verified_hours: number | null;
  created_at: string;
  check_in_method?: 'self' | 'manual';
  check_out_method?: 'self' | 'manual' | 'auto' | null;
  check_out_reason?: string | null;
  verification_note?: string | null;
  flags?: string[];
}

export interface CertificateRow {
  id: number;
  volunteer_id: number;
  org_id: number;
  issued_date: string;
  milestone_hours: number;
  file_path: string;
  created_at: string;
}

export interface ReportRow {
  id: number;
  org_id: number;
  generated_by: number;
  period: string;
  total_volunteers: number;
  total_hours: number;
  file_path: string;
  status: string;
  created_at: string;
}

export interface AnnouncementRow {
  id: number;
  org_id: number;
  posted_by: number;
  title: string;
  message: string;
  target_audience: Audience;
  created_at: string;
}

export interface AuditRow {
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

export interface DocumentRow {
  id: number;
  org_id: number;
  volunteer_id: number;
  document_type: DocumentType;
  title: string;
  file_url: string;
  mime_type: string;
  file_size_bytes: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  coordinator_notes: string | null;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
}

export interface NotificationRow extends AppNotification {
  user_id: number;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  at: string;
}

export interface Tables {
  organizations: OrganizationRow[];
  users: UserRow[];
  volunteers: VolunteerRow[];
  events: EventRow[];
  shifts: ShiftRow[];
  assignments: AssignmentRow[];
  attendances: AttendanceRow[];
  certificates: CertificateRow[];
  reports: ReportRow[];
  announcements: AnnouncementRow[];
  audit: AuditRow[];
  documents: DocumentRow[];
  notifications: NotificationRow[];
  chat: Record<number, ChatTurn[]>;
  tokens: Record<string, number>;
}
