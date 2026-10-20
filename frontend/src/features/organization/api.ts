/** Organization admin console (role: OrgAdmin). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type {
  AttendancePolicy,
  AuditLog,
  BillingSnapshot,
  Invitation,
  OrgAnalytics,
  OrgDocumentType,
  Organization,
  OrganizationDocument,
  Paginated,
  Payment,
  PlanDefinition,
  User,
} from '@/shared/types/api';
import type { VolunteerDetail } from '@/features/people/api';

export interface OrganizationUpdate {
  name?: string;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  primary_color?: string | null;
  subdomain?: string | null;
  attendance?: Partial<AttendancePolicy>;
}

export interface MemberRow extends User {
  relationship: 'member' | 'applicant';
  invitation_pending: boolean;
}

export interface CoordinatorInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
}

export interface BillingInfo extends BillingSnapshot {
  catalog: PlanDefinition[];
  payment_methods: { key: string; name: string; account: string; needs_suffix: boolean; reference_hint: string }[];
  account_name: string;
  currency: string;
  auto_verification: boolean;
  payments: Payment[];
}

export interface PaymentInput {
  plan: 'pro' | 'enterprise';
  months: 1 | 3 | 6 | 12;
  method: string;
  transaction_ref: string;
  payer_name?: string | null;
  payer_account_suffix?: string | null;
}

export interface AuditQuery {
  page?: number;
  action?: string;
  from?: string;
  to?: string;
}

export const orgApi = {
  organization: async () => (await http.get<Organization>('/admin/organization')).data,
  update: async (input: OrganizationUpdate) => (await http.patch<Organization>('/admin/organization', input)).data,
  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return (await http.post<Organization>('/admin/organization/logo', form)).data;
  },
  removeLogo: async () => (await http.delete<Organization>('/admin/organization/logo')).data,
  documents: async () => (await http.get<OrganizationDocument[]>('/admin/organization/documents')).data,
  uploadDocument: async (input: { file: File; document_type: OrgDocumentType; title: string }) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('document_type', input.document_type);
    form.append('title', input.title);
    return (await http.post<OrganizationDocument>('/admin/organization/documents', form)).data;
  },
  members: async (query: { page?: number; q?: string; role?: string; per_page?: number } = {}): Promise<Paginated<MemberRow>> => {
    const r = await http.get<MemberRow[]>('/admin/members', { query: { page: 1, per_page: 50, ...query } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 50, total: r.data.length } };
  },
  allMembers: async () => {
    const first = await orgApi.members({ page: 1, per_page: 100 });
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => orgApi.members({ page: i + 2, per_page: 100 })),
    );
    return [first, ...rest].flatMap((p) => p.items);
  },
  createCoordinator: async (input: CoordinatorInput) => {
    const r = await http.post<User>('/admin/coordinators', input);
    return { user: r.data, invitation: r.raw.invitation as Invitation, message: r.message };
  },
  updateCoordinator: async (id: number, input: Partial<CoordinatorInput>) => (await http.patch<User>(`/admin/coordinators/${id}`, input)).data,
  toggleCoordinator: async (id: number) => (await http.patch(`/admin/coordinators/${id}/status`)).raw as { is_active: boolean; message: string },
  resendCoordinatorInvite: async (id: number) => {
    const r = await http.post(`/admin/coordinators/${id}/resend-invite`);
    return { invitation: r.raw.invitation as Invitation, message: r.message };
  },
  toggleVolunteer: async (userId: number) => (await http.patch(`/admin/volunteers/${userId}/status`)).raw as { is_active: boolean; message: string },
  volunteer: async (volunteerId: number) => (await http.get<VolunteerDetail>(`/admin/volunteers/${volunteerId}`)).data,
  analytics: async () => (await http.get<OrgAnalytics>('/admin/analytics')).data,
  audit: async (query: AuditQuery = {}): Promise<Paginated<AuditLog>> => {
    const r = await http.get<AuditLog[]>('/admin/audit-logs', { query: { per_page: 50, ...query } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 50, total: r.data.length } };
  },
  auditCsv: async (query: AuditQuery = {}) => (await http.get<Blob>('/admin/audit-logs', { query: { ...query, format: 'csv' }, asBlob: true })).data,
  billing: async () => (await http.get<BillingInfo>('/admin/billing')).data,
  submitPayment: async (input: PaymentInput) => {
    const r = await http.post<Payment>('/admin/billing/payments', input);
    return { payment: r.data, message: r.message };
  },
};

export const orgKeys = {
  all: ['org'] as const,
  organization: () => [...orgKeys.all, 'organization'] as const,
  documents: () => [...orgKeys.all, 'documents'] as const,
  members: (q: object) => [...orgKeys.all, 'members', q] as const,
  allMembers: () => [...orgKeys.all, 'members', 'all'] as const,
  volunteer: (id: number) => [...orgKeys.all, 'volunteer', id] as const,
  analytics: () => [...orgKeys.all, 'analytics'] as const,
  audit: (q: AuditQuery) => [...orgKeys.all, 'audit', q] as const,
  billing: () => [...orgKeys.all, 'billing'] as const,
};

export const useOrganization = () => useQuery({ queryKey: orgKeys.organization(), queryFn: orgApi.organization });
export const useOrgDocuments = () => useQuery({ queryKey: orgKeys.documents(), queryFn: orgApi.documents });
export const useMembers = (query: { page?: number; q?: string; role?: string } = {}) =>
  useQuery({ queryKey: orgKeys.members(query), queryFn: () => orgApi.members(query), placeholderData: keepPreviousData });
export const useAllMembers = () => useQuery({ queryKey: orgKeys.allMembers(), queryFn: orgApi.allMembers });
export const useOrgVolunteer = (id: number) => useQuery({ queryKey: orgKeys.volunteer(id), queryFn: () => orgApi.volunteer(id), enabled: Number.isFinite(id) });
export const useOrgAnalytics = () => useQuery({ queryKey: orgKeys.analytics(), queryFn: orgApi.analytics });
export const useOrgAudit = (query: AuditQuery = {}) =>
  useQuery({ queryKey: orgKeys.audit(query), queryFn: () => orgApi.audit(query), placeholderData: keepPreviousData, retry: false });
export const useBilling = () => useQuery({ queryKey: orgKeys.billing(), queryFn: orgApi.billing });

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
export const useRemoveLogo = () => useOrgMutation(orgApi.removeLogo);
export const useUploadOrgDocument = () => useOrgMutation(orgApi.uploadDocument);
export const useCreateCoordinator = () => useOrgMutation(orgApi.createCoordinator);
export const useUpdateCoordinator = () =>
  useOrgMutation(({ id, ...input }: Partial<CoordinatorInput> & { id: number }) => orgApi.updateCoordinator(id, input));
export const useToggleCoordinator = () => useOrgMutation(orgApi.toggleCoordinator);
export const useResendCoordinatorInvite = () => useOrgMutation(orgApi.resendCoordinatorInvite);
export const useToggleVolunteer = () => useOrgMutation(orgApi.toggleVolunteer);
export const useSubmitPayment = () => useOrgMutation(orgApi.submitPayment);

export const FEATURE_LABELS: Record<string, string> = {
  branding: 'Brand color on your workspace',
  reports_export: 'PDF impact reports',
  analytics: 'Advanced analytics',
  audit_log: 'Organization audit trail',
  ai_screening: 'AI applicant screening',
  subdomain: 'Custom subdomain',
  priority_support: 'Priority support',
};

export const LIMIT_LABELS: Record<string, string> = {
  coordinators: 'Coordinators',
  active_events: 'Active events',
  shifts_per_event: 'Shifts per event',
  volunteers: 'Volunteers',
  broadcasts_per_month: 'Urgent alerts / month',
  storage_mb: 'Document storage (MB)',
};
