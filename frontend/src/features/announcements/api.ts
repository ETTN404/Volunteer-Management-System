import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { Announcement, Audience } from '@/shared/types/api';

export const announcementsApi = {
  list: async () => (await http.get<Announcement[]>('/announcements')).data,
  create: async (input: { title: string; message: string; target_audience: Audience }) =>
    (await http.post<Announcement>('/coordinator/announcements', input)).data,
};

export const announcementKeys = { list: ['announcements'] as const };

export const useAnnouncements = () => useQuery({ queryKey: announcementKeys.list, queryFn: announcementsApi.list });

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementKeys.list }),
  });
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Everyone',
  volunteers: 'Volunteers',
  coordinators: 'Coordinators',
};
