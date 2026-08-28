import { VmsStore } from './vmsStore';
import { GeofenceService } from './geofenceService';
import { SkillMatchingService } from './skillMatchingService';
import { ImpactScoreService } from './impactScoreService';
import {
  User,
  Organization,
  Event,
  Shift,
  ShiftAssignment,
  Attendance,
  Certificate,
  Report,
  Announcement,
  Volunteer,
  UserRole,
} from '../types/vms';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  message?: string;
  error?: string;
  headers?: Record<string, string>;
  durationMs: number;
}

export interface ApiConfig {
  mode: 'mock' | 'live';
  liveBaseUrl: string;
  authToken: string;
}

const CONFIG_KEY = 'voluntrack_api_config';

export class ApiClient {
  private static config: ApiConfig = this.loadConfig();

  private static loadConfig(): ApiConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {
      mode: 'live',
      liveBaseUrl: 'http://localhost:8000/api',
      authToken: localStorage.getItem('voluntrack_sanctum_token') || '',
    };
  }

  public static getConfig(): ApiConfig {
    return this.config;
  }

  public static setConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Universal fetcher that routes to either mock handler or real Laravel HTTP fetch
   */
  public static async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any,
    currentUser?: User | null
  ): Promise<ApiResponse<T>> {
    const startTime = performance.now();

    if (this.config.mode === 'live') {
      try {
        const url = `${this.config.liveBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (this.config.authToken) {
          headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const json = await res.json().catch(() => ({}));
        const durationMs = Math.round(performance.now() - startTime);

        // Auto-capture Sanctum bearer token on successful login or registration
        const token = json.access_token || json.data?.access_token;
        if (res.ok && token) {
          localStorage.setItem('voluntrack_sanctum_token', token);
          this.setConfig({ authToken: token });
        }

        return {
          status: res.status,
          data: json.data !== undefined ? json.data : json,
          message: json.message,
          error: res.ok ? undefined : json.error || json.message || 'Request failed',
          durationMs,
        } as ApiResponse<T>;
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - startTime);
        return {
          status: 503,
          data: null as any,
          error: `Network error connecting to live backend (${err?.message || 'Check CORS or server status'})`,
          durationMs,
        } as ApiResponse<T>;
      }
    }

    const mockRes = await this.handleMockRequest(method, endpoint, body, currentUser, startTime);
    return mockRes as ApiResponse<T>;
  }

  private static async handleMockRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body: any,
    currentUser: User | null | undefined,
    startTime: number
  ): Promise<ApiResponse<any>> {
    // Simulate realistic 30-120ms network delay
    await new Promise((r) => setTimeout(r, 60));

    const db = VmsStore.get();
    const durationMs = Math.round(performance.now() - startTime);

    // Tenant check simulation (TenantMiddleware §4.1)
    if (currentUser && currentUser.org_id && currentUser.role !== 'SuperAdmin') {
      const org = db.organizations.find((o) => o.id === currentUser.org_id);
      if (org && org.status === 'suspended') {
        return {
          status: 403,
          data: null as any,
          error: 'Organization Suspended: Your organization has been suspended. Contact the platform administrator.',
          durationMs,
        };
      }
    }

    // Routing Mock Requests:
    try {
      // 1. GET /api/user
      if (endpoint === '/api/user' && method === 'GET') {
        return {
          status: 200,
          data: currentUser || db.users[0],
          durationMs,
        };
      }

      // 2. GET /api/superadmin/organizations
      if (endpoint.startsWith('/api/superadmin/organizations') && method === 'GET') {
        return {
          status: 200,
          data: db.organizations,
          durationMs,
        };
      }

      // 3. PATCH /api/superadmin/organizations/:id/status
      const orgStatusMatch = endpoint.match(/\/api\/superadmin\/organizations\/(\d+)\/status/);
      if (orgStatusMatch && method === 'PATCH') {
        const orgId = parseInt(orgStatusMatch[1]);
        const org = db.organizations.find((o) => o.id === orgId);
        if (!org) return { status: 404, data: null as any, error: 'Organization not found', durationMs };
        const oldStatus = org.status;
        org.status = body?.status || (org.status === 'active' ? 'suspended' : 'active');
        VmsStore.save();
        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          orgId: org.id,
          orgName: org.name,
          action: `tenant.${org.status}`,
          modelType: 'Organization',
          modelId: org.id,
          oldValues: { status: oldStatus },
          newValues: { status: org.status },
        });
        return { status: 200, data: org, message: `Organization status updated to ${org.status}`, durationMs };
      }

      // 4. POST /api/superadmin/onboard-tenant
      if (endpoint === '/api/superadmin/onboard-tenant' && method === 'POST') {
        const newOrg: Organization = {
          id: db.organizations.length + 1,
          name: body.organization_name,
          slug: body.organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          email: body.admin_email,
          phone: body.phone || '+1 (555) 019-2831',
          website: body.website || 'https://example.org',
          status: 'active',
          subscription_plan: body.subscription_plan || 'pro',
          geofence_default_radius: body.geofence_default_radius || 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_volunteers: 0,
          total_hours: 0,
        };
        db.organizations.push(newOrg);

        const newAdmin: User = {
          id: db.users.length + 1,
          org_id: newOrg.id,
          name: body.admin_name,
          email: body.admin_email,
          role: 'OrgAdmin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.users.push(newAdmin);
        VmsStore.save();

        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          orgId: newOrg.id,
          orgName: newOrg.name,
          action: 'tenant.onboarded',
          modelType: 'Organization',
          modelId: newOrg.id,
          newValues: { org: newOrg.name, admin: newAdmin.email },
        });

        return { status: 201, data: { organization: newOrg, admin: newAdmin }, message: 'Tenant successfully onboarded', durationMs };
      }

      // 5. GET /api/volunteer/events or /api/coordinator/events
      if (endpoint.includes('/events') && method === 'GET') {
        let events = [...db.events];
        // Tenant Scope isolation check (§10.2)
        if (currentUser?.role !== 'SuperAdmin' && currentUser?.org_id) {
          events = events.filter((e) => e.org_id === currentUser.org_id);
        }

        // Attach shifts & computed slots
        const enrichedEvents = events.map((event) => {
          const shifts = db.shifts
            .filter((s) => s.event_id === event.id)
            .map((shift) => {
              const assignments = db.shiftAssignments.filter((a) => a.shift_id === shift.id && a.status !== 'cancelled' && a.status !== 'rejected');
              const available = Math.max(0, shift.capacity - assignments.length);
              return {
                ...shift,
                assignments,
                available_slots: available,
                is_full: available === 0,
              };
            });
          return {
            ...event,
            shifts,
            organization: db.organizations.find((o) => o.id === event.org_id),
          };
        });

        return { status: 200, data: enrichedEvents, durationMs };
      }

      // 6. POST /api/coordinator/events
      if (endpoint === '/api/coordinator/events' && method === 'POST') {
        const newEvent: Event = {
          id: db.events.length + 1,
          org_id: currentUser?.org_id || 1,
          title: body.title,
          description: body.description,
          category: body.category || 'Community Service',
          venue_name: body.venue_name,
          venue_address: body.venue_address,
          latitude: parseFloat(body.latitude) || 37.7749,
          longitude: parseFloat(body.longitude) || -122.4194,
          geofence_radius: parseInt(body.geofence_radius) || 100,
          start_date: body.start_date,
          end_date: body.end_date,
          status: 'upcoming',
          image_url: body.image_url || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.events.unshift(newEvent);

        if (Array.isArray(body.shifts)) {
          body.shifts.forEach((s: any, idx: number) => {
            const shift: Shift = {
              id: db.shifts.length + idx + 1,
              event_id: newEvent.id,
              title: s.title || `Shift ${idx + 1}`,
              description: s.description,
              start_time: s.start_time,
              end_time: s.end_time,
              capacity: parseInt(s.capacity) || 10,
              required_skills: Array.isArray(s.required_skills) ? s.required_skills : ['General'],
              qr_code_signature: `QR_SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
              qr_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            db.shifts.push(shift);
          });
        }

        VmsStore.save();
        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          orgId: newEvent.org_id,
          action: 'event.created',
          modelType: 'Event',
          modelId: newEvent.id,
          newValues: { title: newEvent.title, venue: newEvent.venue_name },
        });

        return { status: 201, data: newEvent, message: 'Event and shifts successfully created', durationMs };
      }

      // 7. POST /api/volunteer/apply/:shiftId
      const applyMatch = endpoint.match(/\/api\/volunteer\/apply\/(\d+)/);
      if (applyMatch && method === 'POST') {
        const shiftId = parseInt(applyMatch[1]);
        const shift = db.shifts.find((s) => s.id === shiftId);
        if (!shift) return { status: 404, data: null as any, error: 'Shift not found', durationMs };

        const volunteer = db.volunteers.find((v) => v.user_id === currentUser?.id) || db.volunteers[0];
        
        // Overlapping shift check (§20.2 Test #4)
        const activeAssignments = db.shiftAssignments.filter((a) => a.volunteer_id === volunteer.id && (a.status === 'approved' || a.status === 'applied'));
        for (const assign of activeAssignments) {
          const otherShift = db.shifts.find((s) => s.id === assign.shift_id);
          if (otherShift && otherShift.id !== shift.id) {
            if (otherShift.start_time === shift.start_time) {
              return {
                status: 409,
                data: null as any,
                error: `Schedule Conflict: You are already registered for "${otherShift.title}" at the same time.`,
                durationMs,
              };
            }
          }
        }

        // Capacity check
        const confirmed = db.shiftAssignments.filter((a) => a.shift_id === shift.id && a.status === 'approved');
        if (confirmed.length >= shift.capacity) {
          return { status: 422, data: null as any, error: 'Shift is already at full capacity.', durationMs };
        }

        const matchScore = SkillMatchingService.calculateMatchScore(volunteer.skills, shift.required_skills);
        const newAssignment: ShiftAssignment = {
          id: db.shiftAssignments.length + 1,
          shift_id: shift.id,
          volunteer_id: volunteer.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
          match_score: matchScore,
        };
        db.shiftAssignments.push(newAssignment);
        VmsStore.save();

        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'application.submitted',
          modelType: 'ShiftAssignment',
          modelId: newAssignment.id,
          newValues: { shift_id: shift.id, match_score: matchScore },
        });

        return { status: 201, data: newAssignment, message: 'Application submitted successfully', durationMs };
      }

      // 8. POST /api/coordinator/applications/:id/approve
      const approveMatch = endpoint.match(/\/api\/coordinator\/applications\/(\d+)\/approve/);
      if (approveMatch && method === 'POST') {
        const assignId = parseInt(approveMatch[1]);
        const assignment = db.shiftAssignments.find((a) => a.id === assignId);
        if (!assignment) return { status: 404, data: null as any, error: 'Application not found', durationMs };

        const shift = db.shifts.find((s) => s.id === assignment.shift_id);
        const approvedCount = db.shiftAssignments.filter((a) => a.shift_id === assignment.shift_id && a.status === 'approved').length;
        if (shift && approvedCount >= shift.capacity) {
          return { status: 422, data: null as any, error: 'Cannot approve: Shift capacity reached.', durationMs };
        }

        assignment.status = body?.status || 'approved';
        assignment.coordinator_feedback = body?.feedback || 'Approved by coordinator.';
        VmsStore.save();

        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: `application.${assignment.status}`,
          modelType: 'ShiftAssignment',
          modelId: assignment.id,
          newValues: { status: assignment.status, feedback: assignment.coordinator_feedback },
        });

        return { status: 200, data: assignment, message: `Application ${assignment.status}`, durationMs };
      }

      // 9. POST /api/volunteer/check-in
      if (endpoint === '/api/volunteer/check-in' && method === 'POST') {
        const { shift_id, qr_signature, latitude, longitude, signature_preview } = body;
        const shift = db.shifts.find((s) => s.id === shift_id);
        if (!shift) return { status: 404, data: null as any, error: 'Shift not found', durationMs };
        const event = db.events.find((e) => e.id === shift.event_id);
        if (!event) return { status: 404, data: null as any, error: 'Event not found', durationMs };

        // 1. QR Validation
        if (shift.qr_code_signature && qr_signature !== shift.qr_code_signature) {
          return { status: 400, data: null as any, error: 'Invalid QR Code Signature: Token does not match active shift.', durationMs };
        }

        // 2. QR Expiration Check (§12.1 & §20.2 Test #3)
        if (shift.qr_expires_at && new Date(shift.qr_expires_at).getTime() < Date.now()) {
          return { status: 400, data: null as any, error: 'QR Code Expired: Please request a refreshed QR code from the coordinator.', durationMs };
        }

        // 3. Geofence Haversine Check (§12.2 & §20.2 Test #2)
        const geofenceResult = GeofenceService.isWithinGeofence(
          latitude,
          longitude,
          event.latitude,
          event.longitude,
          event.geofence_radius
        );

        if (!geofenceResult.isWithin) {
          return {
            status: 422,
            data: null as any,
            error: `Geofence Violation: You are ${geofenceResult.distanceMeters}m away from ${event.venue_name}. Max allowed radius is ${geofenceResult.allowedRadiusMeters}m.`,
            durationMs,
          };
        }

        const volunteer = db.volunteers.find((v) => v.user_id === currentUser?.id) || db.volunteers[0];
        const newAttendance: Attendance = {
          id: db.attendances.length + 1,
          shift_id: shift.id,
          volunteer_id: volunteer.id,
          check_in_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          check_in_lat: latitude,
          check_in_lon: longitude,
          distance_from_venue_meters: geofenceResult.distanceMeters,
          is_within_geofence: true,
          signature_preview: signature_preview || 'signed',
          verification_method: 'qr_geofence',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.attendances.push(newAttendance);

        // Update assignment status
        const assignment = db.shiftAssignments.find((a) => a.shift_id === shift.id && a.volunteer_id === volunteer.id);
        if (assignment) {
          assignment.status = 'checked_in';
        }

        VmsStore.save();
        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'attendance.check_in',
          modelType: 'Attendance',
          modelId: newAttendance.id,
          newValues: { shift_id: shift.id, distance: geofenceResult.distanceMeters },
        });

        return {
          status: 200,
          data: newAttendance,
          message: `Verified check-in! Distance: ${geofenceResult.distanceMeters}m from venue.`,
          durationMs,
        };
      }

      // 10. POST /api/volunteer/check-out
      if (endpoint === '/api/volunteer/check-out' && method === 'POST') {
        const { attendance_id, hours_worked } = body;
        const attendance = db.attendances.find((a) => a.id === attendance_id) || db.attendances[db.attendances.length - 1];
        if (!attendance) return { status: 404, data: null as any, error: 'Active check-in record not found', durationMs };

        const shift = db.shifts.find((s) => s.id === attendance.shift_id);
        const volunteer = db.volunteers.find((v) => v.id === attendance.volunteer_id) || db.volunteers[0];
        
        const verifiedHours = hours_worked ? parseFloat(hours_worked) : 4.0;
        const prevHours = volunteer.total_hours;
        const newHours = Math.round((prevHours + verifiedHours) * 10) / 10;

        attendance.check_out_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
        attendance.verified_hours = verifiedHours;

        // Calculate impact increment (§6.2)
        const increment = ImpactScoreService.calculateIncrement({
          hoursWorked: verifiedHours,
          requiredSkillsCount: shift?.required_skills?.length || 1,
          isOnTime: true,
          attendanceRate: volunteer.attendance_rate,
        });

        volunteer.total_hours = newHours;
        volunteer.impact_score = Math.min(100, Math.round((volunteer.impact_score + increment.totalEarned) * 10) / 10);

        // Check milestones (§14.2)
        const newlyCrossed = ImpactScoreService.checkMilestones(prevHours, newHours);
        const newCerts: Certificate[] = [];

        newlyCrossed.forEach((milestone) => {
          const cert: Certificate = {
            id: db.certificates.length + 1,
            org_id: currentUser?.org_id || 1,
            volunteer_id: volunteer.id,
            certificate_number: `VMS-${milestone}HR-${Math.floor(100000 + Math.random() * 900000)}`,
            title: `${milestone} Verified Volunteer Service Hours Milestone`,
            milestone_hours: milestone,
            issued_date: new Date().toISOString().substring(0, 10),
            signatory_name: 'Marcus Reed',
            signatory_title: 'Executive Director, Hope Food Relief',
            pdf_generated: true,
            created_at: new Date().toISOString(),
          };
          db.certificates.push(cert);
          newCerts.push(cert);
        });

        // Update assignment
        const assign = db.shiftAssignments.find((a) => a.shift_id === attendance.shift_id && a.volunteer_id === volunteer.id);
        if (assign) assign.status = 'completed';

        VmsStore.save();
        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'attendance.check_out',
          modelType: 'Attendance',
          modelId: attendance.id,
          newValues: { hours: verifiedHours, impactEarned: increment.totalEarned, milestonesCrossed: newlyCrossed },
        });

        return {
          status: 200,
          data: {
            attendance,
            volunteer,
            impactIncrement: increment,
            newlyCrossedMilestones: newlyCrossed,
            generatedCertificates: newCerts,
          },
          message: `Checked out successfully! Logged +${verifiedHours} hrs and +${increment.totalEarned} impact pts.`,
          durationMs,
        };
      }

      // 11. POST /api/coordinator/shifts/:id/qrcode (Generate fresh QR)
      const qrMatch = endpoint.match(/\/api\/coordinator\/shifts\/(\d+)\/qrcode/);
      if (qrMatch && method === 'POST') {
        const shiftId = parseInt(qrMatch[1]);
        const shift = db.shifts.find((s) => s.id === shiftId);
        if (!shift) return { status: 404, data: null as any, error: 'Shift not found', durationMs };

        shift.qr_code_signature = `QR_SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        shift.qr_expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        VmsStore.save();

        return {
          status: 200,
          data: {
            shift_id: shift.id,
            qr_code_signature: shift.qr_code_signature,
            qr_expires_at: shift.qr_expires_at,
            expires_in_minutes: 15,
          },
          message: 'Generated new signed QR Code (expires in 15 mins)',
          durationMs,
        };
      }

      // 12. POST /api/coordinator/reports (Async report generation §15.2)
      if (endpoint === '/api/coordinator/reports' && method === 'POST') {
        const newReport: Report = {
          id: db.reports.length + 1,
          org_id: currentUser?.org_id || 1,
          generated_by: currentUser?.id || 3,
          report_type: body.report_type || 'impact_summary',
          title: body.title || `VMS ${body.report_type || 'Impact'} Report (${body.period || '2026-Q3'})`,
          period: body.period || '2026-Q3',
          status: 'processing', // starts in processing queue
          file_path: '',
          records_count: 0,
          created_at: new Date().toISOString(),
          data_preview: [],
        };
        db.reports.unshift(newReport);
        VmsStore.save();

        // Simulate async Redis background job completion after 3 seconds
        setTimeout(() => {
          const target = db.reports.find((r) => r.id === newReport.id);
          if (target) {
            target.status = 'completed';
            target.completed_at = new Date().toISOString();
            target.file_path = `/storage/reports/report_${target.id}_${target.period}.csv`;
            target.records_count = 142;
            target.data_preview = [
              { metric: 'Verified Service Hours', value: '1,850.0 hrs' },
              { metric: 'Active Volunteers', value: '142 registered' },
              { metric: 'Geofence Compliance', value: '98.6% within 100m' },
              { metric: 'Average Impact Score', value: '82.3 pts' },
            ];
            VmsStore.save();
          }
        }, 3000);

        return {
          status: 202, // 202 Accepted (Async queue)
          data: {
            report_id: newReport.id,
            status: 'processing',
            message: 'Report generation queued in Redis background worker.',
          },
          durationMs,
        };
      }

      // 13. GET /api/coordinator/reports
      if (endpoint === '/api/coordinator/reports' && method === 'GET') {
        return { status: 200, data: db.reports, durationMs };
      }

      // 14. POST /api/coordinator/shifts/:id/broadcast (Urgent shift broadcast §16.2)
      const broadcastMatch = endpoint.match(/\/api\/coordinator\/shifts\/(\d+)\/broadcast/);
      if (broadcastMatch && method === 'POST') {
        const shiftId = parseInt(broadcastMatch[1]);
        const shift = db.shifts.find((s) => s.id === shiftId);
        if (!shift) return { status: 404, data: null as any, error: 'Shift not found', durationMs };

        shift.is_urgent = true;
        const newAnnouncement: Announcement = {
          id: db.announcements.length + 1,
          org_id: currentUser?.org_id || 1,
          author_id: currentUser?.id || 3,
          author_name: currentUser?.name || 'Coordinator',
          title: `URGENT BROADCAST: Volunteers Needed for "${shift.title}"`,
          content: body?.custom_message || `Critical staffing shortage for shift "${shift.title}" (${shift.start_time}). Required skills: ${shift.required_skills.join(', ')}. Please apply immediately!`,
          target_audience: 'volunteers',
          is_urgent: true,
          shift_id: shift.id,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        db.announcements.unshift(newAnnouncement);
        VmsStore.save();

        VmsStore.logAudit({
          userId: currentUser?.id,
          userName: currentUser?.name,
          action: 'shift.urgent_broadcast',
          modelType: 'Shift',
          modelId: shift.id,
          newValues: { shift_id: shift.id, message: newAnnouncement.title },
        });

        return {
          status: 200,
          data: {
            shift_id: shift.id,
            notified_volunteers_count: 50,
            announcement: newAnnouncement,
          },
          message: 'Urgent shift alert broadcasted to 50 matching volunteers via email & in-app push.',
          durationMs,
        };
      }

      // 15. GET /api/verify/certificate/:number (Public verification §14.4)
      const certVerifyMatch = endpoint.match(/\/api\/verify\/certificate\/([A-Za-z0-9-]+)/);
      if (certVerifyMatch && method === 'GET') {
        const certNum = certVerifyMatch[1].toUpperCase();
        const cert = db.certificates.find((c) => c.certificate_number.toUpperCase() === certNum);
        if (!cert) {
          return { status: 404, data: null as any, error: 'Certificate not found or invalid certificate number', durationMs };
        }
        const volunteer = db.volunteers.find((v) => v.id === cert.volunteer_id);
        const user = db.users.find((u) => u.id === volunteer?.user_id);
        const org = db.organizations.find((o) => o.id === cert.org_id);

        // Masked PII per §14.4 (First name + Last initial only)
        const nameParts = (user?.name || 'Jane Doe').split(' ');
        const maskedName = `${nameParts[0]} ${nameParts.length > 1 ? nameParts[1][0] + '.' : ''}`;

        return {
          status: 200,
          data: {
            certificate_number: cert.certificate_number,
            status: 'VERIFIED_AUTHENTIC',
            volunteer_public_name: maskedName,
            organization_name: org?.name || 'Accredited VMS Organization',
            milestone_hours: cert.milestone_hours,
            title: cert.title,
            issued_date: cert.issued_date,
            signatory: cert.signatory_name,
            signatory_title: cert.signatory_title,
            cryptographic_hash: `SHA256:${Math.random().toString(16).substring(2, 14)}...`,
          },
          message: 'Certificate successfully verified.',
          durationMs,
        };
      }

      // Default fallback
      return {
        status: 200,
        data: { message: `Mock route ${method} ${endpoint} executed successfully` } as any,
        durationMs,
      };
    } catch (err: any) {
      return {
        status: 500,
        data: null as any,
        error: err?.message || 'Server error',
        durationMs,
      };
    }
  }
}
