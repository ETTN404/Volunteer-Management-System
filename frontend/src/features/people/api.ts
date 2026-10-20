/**
 * Volunteer directory (Coordinator/OrgAdmin), certificates issuance and reports.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { Attendance, Certificate, Paginated, Report, SkillVerificationStatus, Volunteer, VolunteerProfile } from '@/shared/types/api';

/** A volunteer as seen by one organization: members plus anyone who applied to its shifts. */
export interface DirectoryVolunteer extends Volunteer {
  relationship: 'member' | 'applicant';
  org_stats: {
    pending_applications: number;
    upcoming_shifts: number;
    shifts_worked: number;
    hours_here: number;
    hours_pending: number;
    last_shift_at: string | null;
    on_shift_now: boolean;
  };
}

export interface VolunteerHistoryRow {
  assignment_id: number;
  status: string;
  event: { id: number | null; title: string | null };
  shift: { id: number | null; title: string | null; start_time: string | null; end_time: string | null };
  attendance: Attendance | null;
}

export interface VolunteerDetail extends VolunteerProfile {
  relationship?: 'member' | 'applicant';
  history?: VolunteerHistoryRow[];
}

export interface DirectoryQuery {
  page?: number;
  q?: string;
  skill?: string;
}

export const peopleApi = {
  volunteers: async (query: DirectoryQuery = {}): Promise<Paginated<DirectoryVolunteer>> => {
    const r = await http.get<DirectoryVolunteer[]>('/coordinator/volunteers', { query: { page: 1, per_page: 25, ...query } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 25, total: r.data.length } };
  },
  allVolunteers: async () => {
    const first = await peopleApi.volunteers({ page: 1 });
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => peopleApi.volunteers({ page: i + 2 })));
    return [first, ...rest].flatMap((p) => p.items);
  },
  volunteer: async (id: number) => (await http.get<VolunteerDetail>(`/coordinator/volunteers/${id}`)).data,
  verifySkill: async (volunteerId: number, skill: string, status: SkillVerificationStatus) =>
    (await http.patch<Volunteer>(`/coordinator/volunteers/${volunteerId}/skills/${encodeURIComponent(skill)}`, { status })).data,
  issueCertificate: async (volunteer_id: number, milestone_hours: number) =>
    (await http.post<Certificate>('/coordinator/certificates', { volunteer_id, milestone_hours })).data,

  reports: async () => (await http.get<Report[]>('/coordinator/reports')).data,
  report: async (id: number) => (await http.get<Report>(`/coordinator/reports/${id}`)).data,
  generateReport: async (input: { period: string; from?: string; to?: string; async?: boolean }) => {
    const r = await http.post<Report | undefined>('/coordinator/reports', input);
    return { report: r.status === 201 ? (r.data as Report) : null, queued: r.status === 202, message: r.message };
  },
  deleteReport: (id: number) => http.delete(`/coordinator/reports/${id}`),
  exportReport: async (id: number, format: 'csv' | 'pdf' = 'csv') =>
    (await http.get<Blob>(`/coordinator/reports/${id}/export`, { query: { format }, asBlob: true })).data,
};

export const peopleKeys = {
  volunteers: (q: DirectoryQuery) => ['people', 'volunteers', q] as const,
  allVolunteers: ['people', 'volunteers', 'all'] as const,
  volunteer: (id: number) => ['people', 'volunteer', id] as const,
  reports: ['reports'] as const,
};

export const useVolunteerDirectory = (query: DirectoryQuery = {}) =>
  useQuery({ queryKey: peopleKeys.volunteers(query), queryFn: () => peopleApi.volunteers(query), placeholderData: keepPreviousData });
export const useAllVolunteers = () => useQuery({ queryKey: peopleKeys.allVolunteers, queryFn: peopleApi.allVolunteers });
export const useVolunteerDetail = (id: number) =>
  useQuery({ queryKey: peopleKeys.volunteer(id), queryFn: () => peopleApi.volunteer(id), enabled: Number.isFinite(id) });
export const useReports = () => useQuery({ queryKey: peopleKeys.reports, queryFn: peopleApi.reports });

export function useVerifySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerId, skill, status }: { volunteerId: number; skill: string; status: SkillVerificationStatus }) =>
      peopleApi.verifySkill(volunteerId, skill, status),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: peopleKeys.volunteer(v.volunteerId) }),
  });
}

export function useIssueCertificate() {
  return useMutation({
    mutationFn: ({ volunteerId, milestone }: { volunteerId: number; milestone: number }) => peopleApi.issueCertificate(volunteerId, milestone),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: peopleApi.generateReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: peopleKeys.reports }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: peopleApi.deleteReport, onSuccess: () => qc.invalidateQueries({ queryKey: peopleKeys.reports }) });
}
