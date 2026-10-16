/**
 * Volunteer self-service: profile, impact, opportunities, schedule, attendance, certificates.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http, isRouteMissing } from '@/shared/api/http';
import type {
  Attendance,
  Certificate,
  CheckOutResult,
  ImpactBreakdown,
  ImpactHistoryPoint,
  Paginated,
  ShiftAssignment,
  VmsEvent,
  Volunteer,
  VolunteerProfile,
} from '@/shared/types/api';

export interface UpdateProfileInput {
  full_name?: string;
  bio?: string | null;
  skills?: string[];
  availability?: string[];
  /** PENDING-BE (G5) */
  date_of_birth?: string | null;
}

export interface CheckInInput {
  shift_id: number;
  qr_code_signature: string;
  latitude: number;
  longitude: number;
  client_timestamp: string;
}

export const volunteerApi = {
  profile: async () => (await http.get<VolunteerProfile>('/volunteer/profile')).data,
  updateProfile: async (input: UpdateProfileInput) => (await http.patch<Volunteer>('/volunteer/profile', input)).data,
  impact: async () => (await http.get<ImpactBreakdown>('/volunteer/impact')).data,
  /** PENDING-BE (G10) */
  impactHistory: async () => (await http.get<ImpactHistoryPoint[]>('/volunteer/impact/history')).data,
  events: async (page = 1): Promise<Paginated<VmsEvent>> => {
    const r = await http.get<VmsEvent[]>('/volunteer/events', { query: { page } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: r.data.length, total: r.data.length } };
  },
  /** PENDING-BE (G8) — falls back to scanning the paginated list until the detail route ships. */
  event: async (eventId: number): Promise<VmsEvent> => {
    try {
      return (await http.get<VmsEvent>(`/volunteer/events/${eventId}`)).data;
    } catch (e) {
      if (!isRouteMissing(e)) throw e;
      for (let page = 1; page < 50; page++) {
        const r = await volunteerApi.events(page);
        const hit = r.items.find((x) => x.id === eventId);
        if (hit) return hit;
        if (page >= r.pagination.last_page) break;
      }
      throw e;
    }
  },
  apply: async (shiftId: number) => (await http.post<ShiftAssignment>(`/volunteer/apply/${shiftId}`)).data,
  withdraw: (assignmentId: number) => http.delete(`/volunteer/apply/${assignmentId}`),
  schedule: async () => (await http.get<ShiftAssignment[]>('/volunteer/schedule')).data,
  /** PENDING-BE (G9) — until it ships, fall back to check-ins recorded on this device. */
  attendance: async (): Promise<Attendance[]> => {
    try {
      return (await http.get<Attendance[]>('/volunteer/attendance')).data;
    } catch (e) {
      if (isRouteMissing(e)) return localCheckIns.list();
      throw e;
    }
  },
  checkIn: async (input: CheckInInput) => {
    const r = await http.post<Attendance>('/volunteer/check-in', input);
    return { attendance: r.data, message: r.message };
  },
  checkOut: async (shiftId: number) => {
    const r = await http.post<CheckOutResult>('/volunteer/check-out', { shift_id: shiftId });
    return { result: r.data, message: r.message };
  },
  certificates: async () => (await http.get<Certificate[]>('/volunteer/certificates')).data,
  downloadCertificate: async (certificateId: number) =>
    (await http.get<Blob>(`/volunteer/certificates/${certificateId}/download`, { asBlob: true })).data,
};

/** Device-local record of open check-ins (used only while GET /volunteer/attendance is missing). */
const LOCAL_KEY = 'vt-open-checkins';
export const localCheckIns = {
  list(): Attendance[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Attendance[];
    } catch {
      return [];
    }
  },
  add(a: Attendance) {
    const rest = localCheckIns.list().filter((x) => x.shift_id !== a.shift_id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...rest, a]));
  },
  close(shiftId: number) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localCheckIns.list().filter((x) => x.shift_id !== shiftId)));
  },
};

export const volunteerKeys = {
  all: ['volunteer'] as const,
  profile: () => [...volunteerKeys.all, 'profile'] as const,
  impact: () => [...volunteerKeys.all, 'impact'] as const,
  impactHistory: () => [...volunteerKeys.all, 'impact-history'] as const,
  events: (page: number) => [...volunteerKeys.all, 'events', page] as const,
  event: (id: number) => [...volunteerKeys.all, 'event', id] as const,
  schedule: () => [...volunteerKeys.all, 'schedule'] as const,
  attendance: () => [...volunteerKeys.all, 'attendance'] as const,
  certificates: () => [...volunteerKeys.all, 'certificates'] as const,
};

export const useVolunteerProfile = () => useQuery({ queryKey: volunteerKeys.profile(), queryFn: volunteerApi.profile });
export const useImpact = () => useQuery({ queryKey: volunteerKeys.impact(), queryFn: volunteerApi.impact });
export const useImpactHistory = () =>
  useQuery({ queryKey: volunteerKeys.impactHistory(), queryFn: volunteerApi.impactHistory, staleTime: 5 * 60_000 });
export const useOpportunities = (page = 1) =>
  useQuery({ queryKey: volunteerKeys.events(page), queryFn: () => volunteerApi.events(page), placeholderData: keepPreviousData });
export const useOpportunity = (eventId: number) =>
  useQuery({ queryKey: volunteerKeys.event(eventId), queryFn: () => volunteerApi.event(eventId), enabled: Number.isFinite(eventId) });
export const useSchedule = () => useQuery({ queryKey: volunteerKeys.schedule(), queryFn: volunteerApi.schedule });
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
function useScheduleMutation<TVars>(fn: (v: TVars) => Promise<unknown>) {
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

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.checkIn,
    onSuccess: ({ attendance }) => {
      if (attendance) localCheckIns.add(attendance);
      qc.invalidateQueries({ queryKey: volunteerKeys.attendance() });
      qc.invalidateQueries({ queryKey: volunteerKeys.schedule() });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: volunteerApi.checkOut,
    onSuccess: (_r, shiftId) => {
      localCheckIns.close(shiftId);
      qc.invalidateQueries({ queryKey: volunteerKeys.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
