/** Platform console (role: SuperAdmin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { AuditLog, Organization, OrganizationDetail, Paginated, PlatformMetrics, Role, TimeseriesPoint, User } from '@/shared/types/api';

export interface OnboardInput {
  org_name: string;
  org_email: string;
  org_address: string;
  org_phone?: string | null;
  org_website?: string | null;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

export const platformApi = {
  metrics: async () => (await http.get<PlatformMetrics>('/superadmin/dashboard')).data,
  organizations: async (page = 1): Promise<Paginated<Organization>> => {
    const r = await http.get<Organization[]>('/superadmin/organizations', { query: { page } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 15, total: r.data.length } };
  },
  allOrganizations: async () => {
    const first = await platformApi.organizations(1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => platformApi.organizations(i + 2)));
    return [first, ...rest].flatMap((p) => p.items);
  },
  organization: async (id: number) => (await http.get<OrganizationDetail>(`/superadmin/organizations/${id}`)).data,
  updateStatus: async (id: number, input: { status?: Organization['status']; subscription_plan?: string }) =>
    (await http.patch<Organization>(`/superadmin/organizations/${id}/status`, input)).data,
  onboard: async (input: OnboardInput) =>
    (await http.post<{ organization: Organization; admin: User }>('/superadmin/onboard-tenant', input)).data,
  audit: async () => (await http.get<AuditLog[]>('/superadmin/audit-logs')).data,
  /** PENDING-BE (G22) */
  admins: async () => (await http.get<User[]>('/superadmin/admins')).data,
  /** PENDING-BE (G22) */
  toggleAdmin: async (id: number) => (await http.patch(`/superadmin/admins/${id}/status`)).raw as { is_active: boolean; message: string },
  /** PENDING-BE (G23) */
  timeseries: async () => (await http.get<TimeseriesPoint[]>('/superadmin/metrics/timeseries')).data,
  /** PENDING-BE (G24) */
  users: async (params: { q?: string; role?: Role | '' }) => (await http.get<User[]>('/superadmin/users', { query: params })).data,
};

export const platformKeys = {
  all: ['platform'] as const,
  metrics: () => [...platformKeys.all, 'metrics'] as const,
  organizations: (page: number) => [...platformKeys.all, 'organizations', page] as const,
  allOrganizations: () => [...platformKeys.all, 'organizations', 'all'] as const,
  organization: (id: number) => [...platformKeys.all, 'organization', id] as const,
  audit: () => [...platformKeys.all, 'audit'] as const,
  admins: () => [...platformKeys.all, 'admins'] as const,
  timeseries: () => [...platformKeys.all, 'timeseries'] as const,
  users: (q: string, role: string) => [...platformKeys.all, 'users', q, role] as const,
};

export const usePlatformMetrics = () => useQuery({ queryKey: platformKeys.metrics(), queryFn: platformApi.metrics });
export const useOrganizations = (page = 1) =>
  useQuery({ queryKey: platformKeys.organizations(page), queryFn: () => platformApi.organizations(page), placeholderData: keepPreviousData });
export const useAllOrganizations = () => useQuery({ queryKey: platformKeys.allOrganizations(), queryFn: platformApi.allOrganizations });
export const useOrganizationDetail = (id: number) =>
  useQuery({ queryKey: platformKeys.organization(id), queryFn: () => platformApi.organization(id), enabled: Number.isFinite(id) });
export const usePlatformAudit = () => useQuery({ queryKey: platformKeys.audit(), queryFn: platformApi.audit });
export const useOrgAdmins = () => useQuery({ queryKey: platformKeys.admins(), queryFn: platformApi.admins });
export const usePlatformTimeseries = () => useQuery({ queryKey: platformKeys.timeseries(), queryFn: platformApi.timeseries, staleTime: 10 * 60_000 });
export const usePlatformUsers = (q: string, role: Role | '') =>
  useQuery({ queryKey: platformKeys.users(q, role), queryFn: () => platformApi.users({ q, role }), placeholderData: keepPreviousData });

function usePlatformMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.all }) });
}

export const useUpdateOrgStatus = () =>
  usePlatformMutation(({ id, ...input }: { id: number; status?: Organization['status']; subscription_plan?: string }) => platformApi.updateStatus(id, input));
export const useOnboardTenant = () => usePlatformMutation(platformApi.onboard);
export const useToggleAdmin = () => usePlatformMutation(platformApi.toggleAdmin);

export const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;
