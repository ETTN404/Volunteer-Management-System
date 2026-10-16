/** PENDING-BE (G6) — volunteer document upload & coordinator review. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { DocumentType, VolunteerDocument } from '@/shared/types/api';

export const DOCUMENT_TYPES: { value: DocumentType; label: string; hint: string }[] = [
  { value: 'certification', label: 'Certification', hint: 'First aid, nursing, teaching or other skill certificates' },
  { value: 'id_proof', label: 'ID document', hint: 'Kebele ID, passport or student ID' },
  { value: 'parental_consent', label: 'Parental consent', hint: 'Required for volunteers under 18' },
  { value: 'medical_clearance', label: 'Medical clearance', hint: 'Fitness letter for physically demanding shifts' },
];

export const DOCUMENT_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
} as const;

export const documentsApi = {
  mine: async () => (await http.get<VolunteerDocument[]>('/volunteer/documents')).data,
  upload: async (input: { file: File; document_type: DocumentType; title: string }) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('document_type', input.document_type);
    form.append('title', input.title);
    return (await http.post<VolunteerDocument>('/volunteer/documents', form)).data;
  },
  remove: (id: number) => http.delete(`/volunteer/documents/${id}`),
  queue: async (status?: 'pending' | 'verified' | 'rejected') =>
    (await http.get<VolunteerDocument[]>('/coordinator/documents', { query: { status } })).data,
  review: async (id: number, input: { status: 'verified' | 'rejected'; notes?: string | null }) =>
    (await http.patch<VolunteerDocument>(`/coordinator/documents/${id}/verify`, input)).data,
};

export const documentKeys = {
  mine: ['documents', 'mine'] as const,
  queue: (status?: string) => ['documents', 'queue', status ?? 'all'] as const,
};

export const useMyDocuments = () => useQuery({ queryKey: documentKeys.mine, queryFn: documentsApi.mine });
export const useDocumentQueue = (status?: 'pending' | 'verified' | 'rejected') =>
  useQuery({ queryKey: documentKeys.queue(status), queryFn: () => documentsApi.queue(status) });

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: documentsApi.upload, onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.mine }) });
}
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: documentsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.mine }) });
}
export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; status: 'verified' | 'rejected'; notes?: string | null }) => documentsApi.review(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', 'queue'] }),
  });
}
