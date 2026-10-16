/** Organization admin console (role: OrgAdmin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http, isRouteMissing } from '@/shared/api/http';
import type { AuditLog, OrgAnalytics, Organization, Paginated, User, VolunteerProfile } from '@/shared/types/api';

export interface OrganizationUpdate {
  name?: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  /** PENDING-BE (G20) */
  primary_color?: string | null;
  /** PENDING-BE (G20) */
  subdomain?: string | null;
}

export const orgApi = {
  organization: async () => (await http.get<Organization>('/admin/organization')).data,
  update: async (input: OrganizationUpdate) => (await http.patch<Organization>('/admin/organization', input)).data,
  /** PENDING-BE (G20) */
  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return (await http.post<Organization>('/admin/organization/logo', form)).data;
  },
  members: async (page = 1): Promise<Paginated<User>> => {
    const r = await http.get<User[]>('/admin/members', { query: { page } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 20, total: r.data.length } };
  },
  allMembers: async () => {
    const first = await orgApi.members(1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => orgApi.members(i + 2)));
    return [first, ...rest].flatMap((p) => p.items);
  },
  createCoordinator: async (input: { full_name: string; email: string; password: string }) =>
    (await http.post<User>('/admin/coordinators', input)).data,
  /** PENDING-BE (G19) */
  updateCoordinator: async (id: number, input: { full_name?: string; email?: string }) =>
    (await http.patch<User>(`/admin/coordinators/${id}`, input)).data,
  /** PENDING-BE (G19) */
  toggleCoordinator: async (id: number) => (await http.patch(`/admin/coordinators/${id}/status`)).raw as { is_active: boolean; message: string },
  toggleVolunteer: async (userId: number) => (await http.patch(`/admin/volunteers/${userId}/status`)).raw as { is_active: boolean; message: string },
  volunteer: async (volunteerId: number) => (await http.get<VolunteerProfile>(`/admin/volunteers/${volunteerId}`)).data,
  /** PENDING-BE (G18) — derived from members + events until the endpoint ships. */
  analytics: async (): Promise<OrgAnalytics> => {
    try {
      return (await http.get<OrgAnalytics>('/admin/analytics')).data;
    } catch (e) {
      if (!isRouteMissing(e)) throw e;
      const members = await orgApi.allMembers();
      const ev = await http
        .get<{ status: string }[]>('/coordinator/events')
        .then((r) => ({ items: r.data, total: r.pagination?.total ?? r.data.length }))
        .catch(() => ({ items: [] as { status: string }[], total: 0 }));
      const vols = members.filter((m) => m.role === 'Volunteer');
      const skillCount: Record<string, number> = {};
      vols.forEach((v) => (v.volunteer?.skills ?? []).forEach((s) => (skillCount[s] = (skillCount[s] ?? 0) + 1)));
      return {
        volunteers: vols.length,
        active_volunteers: vols.filter((v) => v.is_active).length,
        coordinators: members.filter((m) => m.role === 'Coordinator').length,
        events: ev.total,
        upcoming_events: ev.items.filter((x) => x.status === 'upcoming').length,
        total_hours: Math.round(vols.reduce((s, v) => s + (v.volunteer?.total_hours ?? 0), 0) * 10) / 10,
        hours_by_month: [],
        top_skills: Object.entries(skillCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([skill, count]) => ({ skill, count })),
      };
    }
  },
  /** PENDING-BE (G21) */
  audit: async () => (await http.get<AuditLog[]>('/admin/audit-logs')).data,
};

export const orgKeys = {
  all: ['org'] as const,
  organization: () => [...orgKeys.all, 'organization'] as const,
  members: (page: number) => [...orgKeys.all, 'members', page] as const,
  allMembers: () => [...orgKeys.all, 'members', 'all'] as const,
  volunteer: (id: number) => [...orgKeys.all, 'volunteer', id] as const,
  analytics: () => [...orgKeys.all, 'analytics'] as const,
  audit: () => [...orgKeys.all, 'audit'] as const,
};

export const useOrganization = () => useQuery({ queryKey: orgKeys.organization(), queryFn: orgApi.organization });
export const useMembers = (page = 1) =>
  useQuery({ queryKey: orgKeys.members(page), queryFn: () => orgApi.members(page), placeholderData: keepPreviousData });
export const useAllMembers = () => useQuery({ queryKey: orgKeys.allMembers(), queryFn: orgApi.allMembers });
export const useOrgVolunteer = (id: number) => useQuery({ queryKey: orgKeys.volunteer(id), queryFn: () => orgApi.volunteer(id), enabled: Number.isFinite(id) });
export const useOrgAnalytics = () => useQuery({ queryKey: orgKeys.analytics(), queryFn: orgApi.analytics });
export const useOrgAudit = () => useQuery({ queryKey: orgKeys.audit(), queryFn: orgApi.audit });

function useOrgMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.all });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export const useUpdateOrganization = () => useOrgMutation(orgApi.update);
export const useUploadLogo = () => useOrgMutation(orgApi.uploadLogo);
export const useCreateCoordinator = () => useOrgMutation(orgApi.createCoordinator);
export const useUpdateCoordinator = () =>
  useOrgMutation(({ id, ...input }: { id: number; full_name?: string; email?: string }) => orgApi.updateCoordinator(id, input));
export const useToggleCoordinator = () => useOrgMutation(orgApi.toggleCoordinator);
export const useToggleVolunteer = () => useOrgMutation(orgApi.toggleVolunteer);
