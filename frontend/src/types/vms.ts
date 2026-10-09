export type UserRole =
  | 'volunteer'
  | 'coordinator'
  | 'admin'
  | 'OrgAdmin'
  | 'SuperAdmin'
  | 'Volunteer'
  | 'Coordinator';

export interface Organization {
  id: number;
  name: string;
  slug?: string;
  subdomain?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo_path?: string;
  status?: 'active' | 'suspended';
  subscription_plan: 'free' | 'pro' | 'enterprise';
  geofence_default_radius?: number;
  settings?: {
    geofence_default_radius: number;
    enable_ai_matching: boolean;
    enable_qr_rotation: boolean;
    enable_milestone_certs: boolean;
  };
  created_at: string;
  updated_at: string;
  total_volunteers?: number;
  total_hours?: number;
}

export interface User {
  id: number;
  organization_id?: number | null;
  org_id?: number | null;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profile_photo_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Volunteer {
  id: number;
  user_id: number;
  skills: string[];
  bio?: string;
  emergency_contact?: string;
  availability?: string[];
  total_hours: number;
  impact_score: number;
  attendance_rate: number;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Event {
  id: number;
  organization_id?: number;
  org_id?: number;
  title: string;
  description: string;
  category: string;
  venue_name: string;
  venue_address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  start_date: string;
  end_date: string;
  status?: 'draft' | 'published' | 'completed' | 'cancelled' | 'upcoming';
  image_url?: string;
  created_at: string;
  updated_at: string;
  shifts?: Shift[];
  organization?: Organization;
}

export interface Shift {
  id: number;
  event_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  capacity: number;
  required_skills: string[];
  is_urgent?: boolean;
  qr_code_signature?: string;
  qr_expires_at?: string;
  available_slots?: number;
  is_full?: boolean;
  created_at: string;
  updated_at: string;
  assignments?: ShiftAssignment[];
  event?: Event;
}

export interface ShiftAssignment {
  id: number;
  shift_id: number;
  volunteer_id: number;
  status: 'applied' | 'approved' | 'rejected' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  applied_at: string;
  coordinator_feedback?: string;
  match_score?: number;
  created_at?: string;
  updated_at?: string;
  shift?: Shift;
  volunteer?: Volunteer;
}

export interface Attendance {
  id: number;
  shift_id: number;
  volunteer_id: number;
  check_in_time: string;
  check_out_time?: string;
  check_in_lat: number;
  check_in_lon: number;
  distance_from_venue_meters: number;
  is_within_geofence: boolean;
  verification_method: 'geofenced_qr' | 'coordinator_force_override' | 'manual_entry' | 'qr_geofence';
  override_reason?: string;
  verified_hours?: number;
  impact_score_earned?: number;
  signature_hash?: string;
  signature_path?: string;
  signature_preview?: string;
  created_at: string;
  updated_at: string;
  volunteer?: Volunteer;
  shift?: Shift;
}

export interface Certificate {
  id: number;
  volunteer_id: number;
  organization_id?: number;
  org_id?: number;
  certificate_number: string;
  title: string;
  milestone_hours: number;
  issued_date: string;
  signatory_name: string;
  signatory_title: string;
  pdf_path?: string;
  download_url?: string;
  pdf_generated?: boolean;
  verification_hash?: string;
  created_at: string;
  volunteer?: Volunteer;
  organization?: Organization;
}

export interface AuditLog {
  id: number;
  organization_id?: number | null;
  org_id?: number | null;
  org_name?: string;
  user_id: number;
  user_name?: string;
  action: string;
  model_type?: string;
  model_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  org_id?: number;
  organization_id?: number;
  shift_id?: number;
  sender_id?: number;
  author_id?: number;
  author_name?: string;
  title: string;
  message?: string;
  content?: string;
  target_audience?: string;
  is_urgent: boolean;
  is_read?: boolean;
  channels?: ('in_app' | 'email' | 'push')[];
  sent_at?: string;
  created_at?: string;
  recipient_count?: number;
}

export interface Report {
  id: number;
  org_id?: number;
  organization_id?: number;
  requested_by?: number;
  generated_by?: number;
  title?: string;
  report_type: string;
  type?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  period?: string;
  records_count?: number;
  data_preview?: any[];
  file_path?: string;
  file_size_bytes?: number;
  parameters?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface TestCase {
  id: string;
  phase: number;
  phaseTitle?: string;
  name?: string;
  title?: string;
  category?: string;
  description: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  payload?: any;
  requestPayload?: any;
  expectedStatus?: number;
  assertionDescription?: string;
  status?: 'idle' | 'running' | 'passed' | 'failed';
  durationMs?: number;
  responsePayload?: any;
  assertions?: { rule?: string; passed?: boolean; message?: string; actual?: any; expected?: any }[];
  logs?: string[];
}

export interface ApiEndpointDef {
  phase?: number;
  name?: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  roleRequired?: string;
  sampleBody?: any;
}

export interface ApiResponse<T = any> {
  status: number;
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  durationMs?: number;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
