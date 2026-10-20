/** Platform console (role: SuperAdmin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type {
  AuditLog,
  Invitation,
  OrgReport,
  OrgStatus,
  Organization,
  OrganizationDetail,
  Paginated,
  Payment,
  PlanKey,
  PlatformMetrics,
  Role,
  TimeseriesPoint,
  User,
} from '@/shared/types/api';

export interface OnboardInput {
  org_name: string;
  org_email: string;
  org_country: string;
  org_city: string;
  org_address?: string | null;
  org_phone: string;
  org_website?: string | null;
  plan?: PlanKey;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone?: string | null;
  documents?: { file: File; type: string; title?: string }[];
}

/** Multipart body for onboarding (documents are files). */
export function onboardForm(input: Record<string, unknown> & { documents?: { file: File; type: string; title?: string }[] }) {
  const form = new FormData();
  for (const [k, v] of Object.entries(input)) {
    if (k === 'documents' || v === undefined || v === null || v === '') continue;
    form.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  (input.documents ?? []).forEach((d, i) => {
    form.append(`documents[${i}][file]`, d.file);
    form.append(`documents[${i}][type]`, d.type);
    if (d.title) form.append(`documents[${i}][title]`, d.title);
  });
  return form;
}

export interface OrgRow extends Organization {
  user_count: number;
  event_count: number;
}

export interface OrgQuery {
  page?: number;
  q?: string;
  status?: OrgStatus | '';
  verification_status?: string;
  subscription_plan?: string;
}

export interface AuditQuery {
  page?: number;
  action?: string;
  org_id?: number | '';
  from?: string;
  to?: string;
}

export interface PaymentSummary {
  total_revenue: number;
  revenue_this_month: number;
  mrr: number;
  paying_organizations: number;
  pending_count: number;
  pending_amount: number;
  rejected_count: number;
  auto_verified_share: number | null;
  by_method: { method: string; count: number; amount: number }[];
  by_plan: { plan: string; count: number; amount: number }[];
  months: { month: string; revenue: number; count: number }[];
  expiring_soon: { id: number; name: string; subscription_plan: string; plan_expires_at: string }[];
}

export interface HealthReport {
  ok: boolean;
  checks: Record<string, { ok: boolean; [k: string]: unknown }>;
  app: { env: string; debug: boolean; php: string; laravel: string; time: string };
}

const page = <T>(r: { data: T[]; pagination?: Paginated<T>['pagination'] }): Paginated<T> => ({
  items: r.data,
  pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: r.data.length, total: r.data.length },
});

export const platformApi = {
  metrics: async () => (await http.get<PlatformMetrics>('/superadmin/dashboard')).data,
  timeseries: async () => (await http.get<TimeseriesPoint[]>('/superadmin/metrics/timeseries')).data,
  health: async () => (await http.get<HealthReport>('/superadmin/health')).data,

  organizations: async (query: OrgQuery = {}) => page(await http.get<OrgRow[]>('/superadmin/organizations', { query: { page: 1, ...query } })),
  allOrganizations: async () => {
    const first = await platformApi.organizations({ page: 1 });
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => platformApi.organizations({ page: i + 2 })),
    );
    return [first, ...rest].flatMap((p) => p.items);
  },
  organization: async (id: number) => (await http.get<OrganizationDetail>(`/superadmin/organizations/${id}`)).data,
  updateStatus: async (id: number, input: { status?: OrgStatus; subscription_plan?: PlanKey; plan_expires_at?: string | null; reason?: string }) =>
    (await http.patch<Organization>(`/superadmin/organizations/${id}/status`, input)).data,
  reviewVerification: async (id: number, input: { status: 'verified' | 'rejected' | 'pending'; notes?: string }) =>
    (await http.patch<Organization>(`/superadmin/organizations/${id}/verification`, input)).data,
  onboard: async (input: OnboardInput) => {
    const r = await http.post<{ organization: Organization; admin: User; invitation: Invitation }>('/superadmin/onboard-tenant', onboardForm({ ...input }));
    return { ...r.data, message: r.message };
  },

  audit: async (query: AuditQuery = {}) => page(await http.get<AuditLog[]>('/superadmin/audit-logs', { query: { per_page: 50, ...query } })),
  auditCsv: async (query: AuditQuery = {}) =>
    (await http.get<Blob>('/superadmin/audit-logs', { query: { ...query, format: 'csv' }, asBlob: true })).data,

  admins: async (q = '') => page(await http.get<(User & { invitation_pending: boolean })[]>('/superadmin/admins', { query: { q, per_page: 100 } })),
  toggleUser: async (id: number) => (await http.patch(`/superadmin/users/${id}/status`)).raw as { is_active: boolean; message: string },
  resendInvite: async (id: number) => {
    const r = await http.post(`/superadmin/users/${id}/resend-invite`);
    return { invitation: r.raw.invitation as Invitation, message: r.message };
  },
  users: async (params: { q?: string; role?: Role | ''; page?: number }) =>
    page(await http.get<User[]>('/superadmin/users', { query: { per_page: 50, ...params } })),

  payments: async (params: { status?: string; q?: string; page?: number }) => page(await http.get<Payment[]>('/superadmin/payments', { query: params })),
  paymentSummary: async () => (await http.get<PaymentSummary>('/superadmin/payments/summary')).data,
  reviewPayment: async (id: number, input: { status: 'verified' | 'rejected'; notes?: string }) =>
    (await http.patch<Payment>(`/superadmin/payments/${id}`, input)).data,
  retryPayment: async (id: number) => {
    const r = await http.post<Payment>(`/superadmin/payments/${id}/retry`);
    return { payment: r.data, message: r.message };
  },

  reports: async (status = '') => page(await http.get<OrgReport[]>('/superadmin/reports', { query: { status } })),
  reviewReport: async (id: number, input: { status: OrgReport['status']; resolution_note?: string }) =>
    (await http.patch<OrgReport>(`/superadmin/reports/${id}`, input)).data,
};

export const platformKeys = {
  all: ['platform'] as const,
  metrics: () => [...platformKeys.all, 'metrics'] as const,
  timeseries: () => [...platformKeys.all, 'timeseries'] as const,
  health: () => [...platformKeys.all, 'health'] as const,
  organizations: (q: OrgQuery) => [...platformKeys.all, 'organizations', q] as const,
  allOrganizations: () => [...platformKeys.all, 'organizations', 'all'] as const,
  organization: (id: number) => [...platformKeys.all, 'organization', id] as const,
  audit: (q: AuditQuery) => [...platformKeys.all, 'audit', q] as const,
  admins: (q: string) => [...platformKeys.all, 'admins', q] as const,
  users: (q: string, role: string, page: number) => [...platformKeys.all, 'users', q, role, page] as const,
  payments: (status: string, q: string, page: number) => [...platformKeys.all, 'payments', status, q, page] as const,
  paymentSummary: () => [...platformKeys.all, 'payment-summary'] as const,
  reports: (status: string) => [...platformKeys.all, 'reports', status] as const,
};

export const usePlatformMetrics = () => useQuery({ queryKey: platformKeys.metrics(), queryFn: platformApi.metrics });
export const usePlatformTimeseries = () => useQuery({ queryKey: platformKeys.timeseries(), queryFn: platformApi.timeseries, staleTime: 5 * 60_000 });
export const usePlatformHealth = () => useQuery({ queryKey: platformKeys.health(), queryFn: platformApi.health, refetchInterval: 60_000 });
export const useOrganizations = (query: OrgQuery = {}) =>
  useQuery({ queryKey: platformKeys.organizations(query), queryFn: () => platformApi.organizations(query), placeholderData: keepPreviousData });
export const useAllOrganizations = (enabled = true) => useQuery({ queryKey: platformKeys.allOrganizations(), queryFn: platformApi.allOrganizations, enabled });
export const useOrganizationDetail = (id: number) =>
  useQuery({ queryKey: platformKeys.organization(id), queryFn: () => platformApi.organization(id), enabled: Number.isFinite(id) });
export const usePlatformAudit = (query: AuditQuery = {}) =>
  useQuery({ queryKey: platformKeys.audit(query), queryFn: () => platformApi.audit(query), placeholderData: keepPreviousData });
export const useOrgAdmins = (q = '') =>
  useQuery({ queryKey: platformKeys.admins(q), queryFn: () => platformApi.admins(q), placeholderData: keepPreviousData });
export const usePlatformUsers = (q: string, role: Role | '', pageNo = 1) =>
  useQuery({ queryKey: platformKeys.users(q, role, pageNo), queryFn: () => platformApi.users({ q, role, page: pageNo }), placeholderData: keepPreviousData });
export const usePayments = (status = '', q = '', pageNo = 1) =>
  useQuery({ queryKey: platformKeys.payments(status, q, pageNo), queryFn: () => platformApi.payments({ status, q, page: pageNo }), placeholderData: keepPreviousData });
export const usePaymentSummary = () => useQuery({ queryKey: platformKeys.paymentSummary(), queryFn: platformApi.paymentSummary });
export const useOrgReports = (status = '') => useQuery({ queryKey: platformKeys.reports(status), queryFn: () => platformApi.reports(status) });

function usePlatformMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.all }) });
}

export const useUpdateOrgStatus = () =>
  usePlatformMutation(({ id, ...input }: { id: number; status?: OrgStatus; subscription_plan?: PlanKey; plan_expires_at?: string | null; reason?: string }) =>
    platformApi.updateStatus(id, input),
  );
export const useReviewVerification = () =>
  usePlatformMutation(({ id, ...input }: { id: number; status: 'verified' | 'rejected' | 'pending'; notes?: string }) => platformApi.reviewVerification(id, input));
export const useOnboardTenant = () => usePlatformMutation(platformApi.onboard);
export const useToggleUser = () => usePlatformMutation(platformApi.toggleUser);
/** @deprecated alias kept for older imports */
export const useToggleAdmin = useToggleUser;
export const useResendInvite = () => usePlatformMutation(platformApi.resendInvite);
export const useReviewPayment = () =>
  usePlatformMutation(({ id, ...input }: { id: number; status: 'verified' | 'rejected'; notes?: string }) => platformApi.reviewPayment(id, input));
export const useRetryPayment = () => usePlatformMutation(platformApi.retryPayment);
export const useReviewOrgReport = () =>
  usePlatformMutation(({ id, ...input }: { id: number; status: OrgReport['status']; resolution_note?: string }) => platformApi.reviewReport(id, input));

export const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export const REPORT_CATEGORY_LABEL: Record<OrgReport['category'], string> = {
  fraud_or_scam: 'Fraud or scam',
  unsafe_conditions: 'Unsafe conditions',
  harassment: 'Harassment',
  misleading_event: 'Misleading event',
  payment_requested: 'Asked volunteers for money',
  other: 'Other',
};
