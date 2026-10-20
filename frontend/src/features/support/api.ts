/**
 * Platform ↔ organization messaging. The same screens serve SuperAdmins
 * (`/superadmin/threads`) and organization admins (`/admin/threads`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { SupportThread } from '@/shared/types/api';

export type SupportSide = 'platform' | 'org';

const base = (side: SupportSide) => (side === 'platform' ? '/superadmin/threads' : '/admin/threads');

export const supportApi = {
  list: async (side: SupportSide, status = '') => {
    const r = await http.get<SupportThread[]>(base(side), { query: { status } });
    return { items: r.data, unread: Number(r.raw.unread_count ?? 0) };
  },
  thread: async (side: SupportSide, id: number) => (await http.get<SupportThread>(`${base(side)}/${id}`)).data,
  start: async (side: SupportSide, input: { subject: string; body: string; org_ids?: number[]; all?: boolean }) => {
    const r = await http.post<SupportThread | { threads: number }>(base(side), input);
    return { data: r.data, message: r.message };
  },
  reply: async (side: SupportSide, id: number, body: string) => (await http.post<SupportThread>(`${base(side)}/${id}/messages`, { body })).data,
  setStatus: async (side: SupportSide, id: number, status: 'open' | 'closed') => (await http.patch<SupportThread>(`${base(side)}/${id}`, { status })).data,
};

export const supportKeys = {
  all: ['support'] as const,
  list: (side: SupportSide, status: string) => [...supportKeys.all, side, 'list', status] as const,
  thread: (side: SupportSide, id: number) => [...supportKeys.all, side, 'thread', id] as const,
};

export const useThreads = (side: SupportSide, status = '') =>
  useQuery({ queryKey: supportKeys.list(side, status), queryFn: () => supportApi.list(side, status), refetchInterval: 60_000 });
export const useThread = (side: SupportSide, id: number | null) =>
  useQuery({
    queryKey: supportKeys.thread(side, id ?? 0),
    queryFn: () => supportApi.thread(side, id!),
    enabled: id != null,
    refetchInterval: 20_000,
  });

function useSupportMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }) });
}

export const useStartThread = (side: SupportSide) =>
  useSupportMutation((input: { subject: string; body: string; org_ids?: number[]; all?: boolean }) => supportApi.start(side, input));
export const useReplyThread = (side: SupportSide) =>
  useSupportMutation(({ id, body }: { id: number; body: string }) => supportApi.reply(side, id, body));
export const useSetThreadStatus = (side: SupportSide) =>
  useSupportMutation(({ id, status }: { id: number; status: 'open' | 'closed' }) => supportApi.setStatus(side, id, status));
