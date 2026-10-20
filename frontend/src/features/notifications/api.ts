/** In-app notifications (bell). Backed by Laravel's notifications table. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { AppNotification } from '@/shared/types/api';

export const notificationsApi = {
  list: async () => {
    const r = await http.get<AppNotification[]>('/notifications', { silent: true });
    return { items: r.data, unread: Number(r.raw.unread_count ?? r.data.filter((n) => !n.read_at).length) };
  },
  read: (id: string) => http.post(`/notifications/${id}/read`),
  readAll: () => http.post('/notifications/read-all'),
};

export const notificationKeys = { list: ['notifications'] as const };

export const useNotifications = () =>
  useQuery({ queryKey: notificationKeys.list, queryFn: notificationsApi.list, refetchInterval: 45_000, retry: false });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.read,
    onMutate: (id) => {
      qc.setQueryData<{ items: AppNotification[]; unread: number }>(notificationKeys.list, (old) =>
        old
          ? {
              items: old.items.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
              unread: Math.max(0, old.unread - (old.items.find((n) => n.id === id && !n.read_at) ? 1 : 0)),
            }
          : old,
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list }),
  });
}
