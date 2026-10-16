/**
 * Volunteer directory (Coordinator/OrgAdmin), certificates issuance and reports.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { Certificate, Paginated, Report, SkillVerificationStatus, Volunteer, VolunteerProfile } from '@/shared/types/api';

export const peopleApi = {
  volunteers: async (page = 1): Promise<Paginated<Volunteer>> => {
    const r = await http.get<Volunteer[]>('/coordinator/volunteers', { query: { page } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 15, total: r.data.length } };
  },
  allVolunteers: async () => {
    const first = await peopleApi.volunteers(1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => peopleApi.volunteers(i + 2)));
    return [first, ...rest].flatMap((p) => p.items);
  },
  volunteer: async (id: number) => (await http.get<VolunteerProfile>(`/coordinator/volunteers/${id}`)).data,
  /** PENDING-BE (G7) */
  verifySkill: async (volunteerId: number, skill: string, status: SkillVerificationStatus) =>
    (await http.patch<Volunteer>(`/coordinator/volunteers/${volunteerId}/skills/${encodeURIComponent(skill)}`, { status })).data,
  issueCertificate: async (volunteer_id: number, milestone_hours: number) =>
    (await http.post<Certificate>('/coordinator/certificates', { volunteer_id, milestone_hours })).data,

  reports: async () => (await http.get<Report[]>('/coordinator/reports')).data,
  report: async (id: number) => (await http.get<Report>(`/coordinator/reports/${id}`)).data,
  generateReport: async (period: string, async = false) => {
    const r = await http.post<Report | undefined>('/coordinator/reports', { period, async });
    return { report: r.status === 201 ? (r.data as Report) : null, queued: r.status === 202, message: r.message };
  },
  /** PENDING-BE (G27) */
  exportReport: async (id: number, format: 'csv' | 'pdf' = 'csv') =>
    (await http.get<Blob>(`/coordinator/reports/${id}/export`, { query: { format }, asBlob: true })).data,
};

export const peopleKeys = {
  volunteers: (page: number) => ['people', 'volunteers', page] as const,
  allVolunteers: ['people', 'volunteers', 'all'] as const,
  volunteer: (id: number) => ['people', 'volunteer', id] as const,
  reports: ['reports'] as const,
};

export const useVolunteerDirectory = (page = 1) =>
  useQuery({ queryKey: peopleKeys.volunteers(page), queryFn: () => peopleApi.volunteers(page), placeholderData: keepPreviousData });
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
    mutationFn: ({ period, async }: { period: string; async?: boolean }) => peopleApi.generateReport(period, async),
    onSuccess: () => qc.invalidateQueries({ queryKey: peopleKeys.reports }),
  });
}
