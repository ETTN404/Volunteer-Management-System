import { useQuery } from '@tanstack/react-query';
import { http, isApiError } from '@/shared/api/http';
import type { CertificateVerification, PublicOrganization, PublicStats } from '@/shared/types/api';

export type VerificationResult = { valid: true; data: CertificateVerification } | { valid: false; message: string };

export const publicApi = {
  /** PENDING-BE (G1) — empty list until the endpoint ships (registration then lets volunteers skip the step). */
  organizations: async (): Promise<PublicOrganization[]> => {
    try {
      return (await http.get<PublicOrganization[]>('/public/organizations')).data;
    } catch (e) {
      if (isApiError(e) && e.isRouteMissing) return [];
      throw e;
    }
  },
  /** PENDING-BE (G2) */
  stats: async () => (await http.get<PublicStats>('/public/stats')).data,
  /** LIVE — GET /verify/certificate/{number} */
  verifyCertificate: async (number: string): Promise<VerificationResult> => {
    try {
      const r = await http.get<CertificateVerification>(`/verify/certificate/${encodeURIComponent(number.trim())}`);
      return { valid: true, data: r.data };
    } catch (e) {
      if (isApiError(e) && e.status === 404) return { valid: false, message: e.message };
      throw e;
    }
  },
};

export const publicKeys = {
  organizations: ['public', 'organizations'] as const,
  stats: ['public', 'stats'] as const,
  verify: (n: string) => ['public', 'verify', n] as const,
};

export const usePublicOrganizations = () =>
  useQuery({ queryKey: publicKeys.organizations, queryFn: publicApi.organizations, staleTime: 10 * 60_000 });
export const usePublicStats = () => useQuery({ queryKey: publicKeys.stats, queryFn: publicApi.stats, staleTime: 10 * 60_000 });
export const useVerifyCertificate = (number: string | undefined) =>
  useQuery({
    queryKey: publicKeys.verify(number ?? ''),
    queryFn: () => publicApi.verifyCertificate(number!),
    enabled: Boolean(number && number.trim().length >= 3),
    staleTime: 60_000,
  });

/** VMS-00012 style public number for a certificate id (matches the verify endpoint fallback). */
export const certificateNumber = (id: number) => `VMS-${String(id).padStart(5, '0')}`;
