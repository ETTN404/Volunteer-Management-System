import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { Announcement, Audience } from '@/shared/types/api';

export const announcementsApi = {
  list: async () => {
    const r = await http.get<Announcement[]>('/announcements', { query: { per_page: 50 } });
    return { items: r.data, unread: Number(r.raw.unread_count ?? 0) };
  },
  create: async (input: { title: string; message: string; target_audience: Audience }) => {
    const r = await http.post<Announcement>('/coordinator/announcements', input);
    return { announcement: r.data, message: r.message };
  },
  remove: (id: number) => http.delete(`/coordinator/announcements/${id}`),
  markRead: (ids: number[]) => http.post('/announcements/read', { ids }, { silent: true }),
};

export const announcementKeys = { list: ['announcements'] as const };

export const useAnnouncements = () => useQuery({ queryKey: announcementKeys.list, queryFn: announcementsApi.list, refetchInterval: 120_000 });

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementKeys.list }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: announcementsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: announcementKeys.list }) });
}

export function useMarkAnnouncementsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: announcementsApi.markRead,
    onMutate: (ids) =>
      qc.setQueryData<{ items: Announcement[]; unread: number }>(announcementKeys.list, (old) =>
        old
          ? {
              items: old.items.map((a) => (ids.includes(a.id) ? { ...a, is_read: true } : a)),
              unread: Math.max(0, old.unread - old.items.filter((a) => ids.includes(a.id) && !a.is_read).length),
            }
          : old,
      ),
  });
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Everyone',
  volunteers: 'Volunteers',
  coordinators: 'Coordinators',
};
