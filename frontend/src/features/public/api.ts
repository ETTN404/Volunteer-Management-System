import { useMutation, useQuery } from '@tanstack/react-query';
import { http, isApiError } from '@/shared/api/http';
import type { CertificateVerification, OrgDocumentType, PlanDefinition, PublicOrganization, PublicStats } from '@/shared/types/api';

export type VerificationResult = { valid: true; data: CertificateVerification } | { valid: false; message: string };

export interface OrganizationSignupInput {
  org_name: string;
  org_email: string;
  org_country: string;
  org_city: string;
  org_address?: string | null;
  org_phone: string;
  org_website?: string | null;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone?: string | null;
  documents: { file: File; type: OrgDocumentType; title?: string }[];
  accept_terms: boolean;
}

export const publicApi = {
  organizations: async () => (await http.get<PublicOrganization[]>('/public/organizations')).data,
  stats: async () => (await http.get<PublicStats>('/public/stats')).data,
  plans: async () => (await http.get<PlanDefinition[]>('/public/plans')).data,
  verifyCertificate: async (number: string): Promise<VerificationResult> => {
    try {
      const r = await http.get<CertificateVerification>(`/verify/certificate/${encodeURIComponent(number.trim())}`);
      return { valid: true, data: r.data };
    } catch (e) {
      if (isApiError(e) && e.status === 404) return { valid: false, message: e.message };
      throw e;
    }
  },
  /** Public organization sign-up (multipart: documents prove the organization is real). */
  signup: async (input: OrganizationSignupInput) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(input)) {
      if (k === 'documents' || v === undefined || v === null || v === '') continue;
      form.append(k, k === 'accept_terms' ? (v ? '1' : '0') : String(v));
    }
    input.documents.forEach((d, i) => {
      form.append(`documents[${i}][file]`, d.file);
      form.append(`documents[${i}][type]`, d.type);
      if (d.title) form.append(`documents[${i}][title]`, d.title);
    });
    const r = await http.post<{ organization: { id: number; name: string }; email_sent: boolean }>('/public/organizations/signup', form, { skipAuthRedirect: true });
    return { ...r.data, message: r.message };
  },
};

export const publicKeys = {
  organizations: ['public', 'organizations'] as const,
  stats: ['public', 'stats'] as const,
  plans: ['public', 'plans'] as const,
  verify: (n: string) => ['public', 'verify', n] as const,
};

export const usePublicOrganizations = () =>
  useQuery({ queryKey: publicKeys.organizations, queryFn: publicApi.organizations, staleTime: 10 * 60_000 });
export const usePublicStats = () => useQuery({ queryKey: publicKeys.stats, queryFn: publicApi.stats, staleTime: 10 * 60_000 });
export const usePublicPlans = () => useQuery({ queryKey: publicKeys.plans, queryFn: publicApi.plans, staleTime: 60 * 60_000 });
export const useOrganizationSignup = () => useMutation({ mutationFn: publicApi.signup });
export const useVerifyCertificate = (number: string | undefined) =>
  useQuery({
    queryKey: publicKeys.verify(number ?? ''),
    queryFn: () => publicApi.verifyCertificate(number!),
    enabled: Boolean(number && number.trim().length >= 3),
    staleTime: 60_000,
  });

/** VMS-00012 style public number for a certificate id (matches the verify endpoint). */
export const certificateNumber = (id: number) => `VMS-${String(id).padStart(5, '0')}`;
