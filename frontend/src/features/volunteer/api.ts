/**
 * Volunteer self-service: profile, impact, opportunities, organizations, schedule,
 * attendance (check-in / out / resume / presence), certificates.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type {
  Attendance,
  Certificate,
  CheckOutResult,
  ImpactBreakdown,
  ImpactHistoryPoint,
  OrgReportCategory,
  OrganizationProfile,
  Paginated,
  ShiftAssignment,
  VmsEvent,
  Volunteer,
  VolunteerProfile,
} from '@/shared/types/api';

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  bio?: string | null;
  skills?: string[];
  availability?: string[];
  date_of_birth?: string | null;
}

export interface CheckInInput {
  shift_id: number;
  qr_code_signature: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  client_timestamp: string;
}

export interface CheckOutInput {
  shift_id: number;
  reason?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
}

export interface EventQuery {
  page?: number;
  q?: string;
  org_id?: number;
  when?: 'upcoming' | 'past';
  per_page?: number;
}

export interface AttendanceRecord extends Attendance {
  shift: Attendance['shift'] & {
    event?: { id: number; title: string; location: string; organization_name: string | null } & Partial<VmsEvent>;
  };
}

/** Stable per-browser id sent with check-ins so one phone checking in several people is flagged. */
export function deviceId(): string {
  const KEY = 'vt-device-id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export const volunteerApi = {
  profile: async () => (await http.get<VolunteerProfile>('/volunteer/profile')).data,
  updateProfile: async (input: UpdateProfileInput) => (await http.patch<Volunteer>('/volunteer/profile', input)).data,
  impact: async () => (await http.get<ImpactBreakdown>('/volunteer/impact')).data,
  impactHistory: async () => (await http.get<ImpactHistoryPoint[]>('/volunteer/impact/history')).data,
  events: async (query: EventQuery = {}): Promise<Paginated<VmsEvent>> => {
    const r = await http.get<VmsEvent[]>('/volunteer/events', { query: { page: 1, ...query } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: r.data.length, total: r.data.length } };
  },
  event: async (eventId: number) => (await http.get<VmsEvent>(`/volunteer/events/${eventId}`)).data,
  organization: async (orgId: number) => (await http.get<OrganizationProfile>(`/volunteer/organizations/${orgId}`)).data,
  reportOrganization: (orgId: number, input: { category: OrgReportCategory; details: string; event_id?: number | null }) =>
    http.post<{ id: number; status: string }>(`/volunteer/organizations/${orgId}/report`, input),
  apply: async (shiftId: number) => (await http.post<ShiftAssignment>(`/volunteer/apply/${shiftId}`)).data,
  withdraw: (assignmentId: number) => http.delete(`/volunteer/apply/${assignmentId}`),
  schedule: async () => (await http.get<ShiftAssignment[]>('/volunteer/schedule')).data,
  attendance: async () => (await http.get<AttendanceRecord[]>('/volunteer/attendance')).data,
  checkIn: async (input: CheckInInput) => {
    const r = await http.post<Attendance>('/volunteer/check-in', input, { headers: { 'X-Device-Id': deviceId() } });
    return { attendance: r.data, message: r.message };
  },
  checkOut: async (input: CheckOutInput) => {
    const r = await http.post<CheckOutResult>('/volunteer/check-out', input);
    return { result: r.data, message: r.message };
  },
  resume: async (shiftId: number) => (await http.post<Attendance>('/volunteer/check-out/undo', { shift_id: shiftId })).data,
  ping: async (input: { shift_id: number; latitude: number; longitude: number; accuracy?: number | null }) =>
    (await http.post<{ inside: boolean; distance_m: number; stored: boolean }>('/volunteer/attendance/ping', input, { silent: true })).data,
  certificates: async () => (await http.get<Certificate[]>('/volunteer/certificates')).data,
  downloadCertificate: async (certificateId: number) =>
    (await http.get<Blob>(`/volunteer/certificates/${certificateId}/download`, { asBlob: true })).data,
};

export const volunteerKeys = {
  all: ['volunteer'] as const,
  profile: () => [...volunteerKeys.all, 'profile'] as const,
  impact: () => [...volunteerKeys.all, 'impact'] as const,
  impactHistory: () => [...volunteerKeys.all, 'impact-history'] as const,
  events: (q: EventQuery) => [...volunteerKeys.all, 'events', q] as const,
  event: (id: number) => [...volunteerKeys.all, 'event', id] as const,
  organization: (id: number) => [...volunteerKeys.all, 'organization', id] as const,
  schedule: () => [...volunteerKeys.all, 'schedule'] as const,
  attendance: () => [...volunteerKeys.all, 'attendance'] as const,
  certificates: () => [...volunteerKeys.all, 'certificates'] as const,
};

export const useVolunteerProfile = () => useQuery({ queryKey: volunteerKeys.profile(), queryFn: volunteerApi.profile });
export const useImpact = () => useQuery({ queryKey: volunteerKeys.impact(), queryFn: volunteerApi.impact });
export const useImpactHistory = () =>
  useQuery({ queryKey: volunteerKeys.impactHistory(), queryFn: volunteerApi.impactHistory, staleTime: 5 * 60_000 });
export const useOpportunities = (query: EventQuery = {}) =>
  useQuery({ queryKey: volunteerKeys.events(query), queryFn: () => volunteerApi.events(query), placeholderData: keepPreviousData });
export const useOpportunity = (eventId: number) =>
  useQuery({ queryKey: volunteerKeys.event(eventId), queryFn: () => volunteerApi.event(eventId), enabled: Number.isFinite(eventId) });
export const useOrganizationProfile = (orgId: number) =>
  useQuery({ queryKey: volunteerKeys.organization(orgId), queryFn: () => volunteerApi.organization(orgId), enabled: Number.isFinite(orgId) });
/** Schedule carries each shift's attendance, so check-in buttons are always in the right state. */
export const useSchedule = () => useQuery({ queryKey: volunteerKeys.schedule(), queryFn: volunteerApi.schedule, refetchInterval: 60_000 });
export const useAttendanceHistory = () => useQuery({ queryKey: volunteerKeys.attendance(), queryFn: volunteerApi.attendance });
export const useMyCertificates = () => useQuery({ queryKey: volunteerKeys.certificates(), queryFn: volunteerApi.certificates });

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: volunteerKeys.profile() });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: [...volunteerKeys.all, 'events'] });
    },
  });
}

/** Apply/withdraw change schedule + event capacity — refresh both. */
function useScheduleMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: volunteerKeys.schedule() });
      qc.invalidateQueries({ queryKey: [...volunteerKeys.all, 'events'] });
      qc.invalidateQueries({ queryKey: [...volunteerKeys.all, 'event'] });
    },
  });
}

export const useApplyForShift = () => useScheduleMutation((shiftId: number) => volunteerApi.apply(shiftId));
export const useWithdrawApplication = () => useScheduleMutation((assignmentId: number) => volunteerApi.withdraw(assignmentId));
export const useReportOrganization = () =>
  useMutation({
    mutationFn: ({ orgId, ...input }: { orgId: number; category: OrgReportCategory; details: string; event_id?: number | null }) =>
      volunteerApi.reportOrganization(orgId, input),
  });

/** Write the server's attendance into the cached schedule immediately (no flash of a stale button). */
function patchScheduleAttendance(qc: ReturnType<typeof useQueryClient>, shiftId: number, attendance: Attendance | null) {
  qc.setQueryData<ShiftAssignment[]>(volunteerKeys.schedule(), (old) =>
    old?.map((a) => (a.shift_id === shiftId ? { ...a, attendance } : a)),
  );
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.checkIn,
    onSuccess: ({ attendance }, vars) => {
      patchScheduleAttendance(qc, vars.shift_id, attendance);
      qc.invalidateQueries({ queryKey: volunteerKeys.attendance() });
      qc.invalidateQueries({ queryKey: volunteerKeys.schedule() });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.checkOut,
    onSuccess: ({ result }, vars) => {
      patchScheduleAttendance(qc, vars.shift_id, result);
      qc.invalidateQueries({ queryKey: volunteerKeys.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useResumeShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.resume,
    onSuccess: (attendance, shiftId) => {
      patchScheduleAttendance(qc, shiftId, attendance);
      qc.invalidateQueries({ queryKey: volunteerKeys.all });
    },
  });
}

/** The volunteer's open attendance (on shift right now), straight from the schedule. */
export function useOpenAttendance() {
  const schedule = useSchedule();
  const open = schedule.data?.find((a) => a.attendance && !a.attendance.check_out_time) ?? null;
  return { ...schedule, open };
}
