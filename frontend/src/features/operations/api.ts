/**
 * Coordinator operations: events, shifts, applications, live attendance, hours, broadcasts.
 * Endpoints are shared by Coordinator and OrgAdmin roles.
 */
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { http, isRouteMissing } from '@/shared/api/http';
import { parseApiDate } from '@/shared/lib/time';
import type {
  AiFeedback,
  Attendance,
  CoordinatorDashboard,
  EventStatus,
  Paginated,
  QrCode,
  RosterEntry,
  Shift,
  ShiftAssignment,
  ShiftCapacity,
  VmsEvent,
  Volunteer,
} from '@/shared/types/api';

export interface EventInput {
  title: string;
  description?: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  start_date: string;
  end_date: string;
  geofence_radius?: number | null;
}

export type EventUpdate = Partial<Pick<EventInput, 'title' | 'description' | 'location' | 'geofence_radius'>> & {
  status?: EventStatus;
};

export interface ShiftInput {
  /** `Y-m-d H:i:s` UTC — use toApiDateTime() */
  start_time: string;
  end_time: string;
  required_skills: string[];
  capacity: number;
}

export interface PendingHours extends Attendance {
  volunteer: Volunteer;
  hours: number;
}

export interface BroadcastPreview {
  matching_volunteers: number;
  remaining_slots: number;
  sample: { id: number; full_name: string; skills: string[] }[];
}

export const opsApi = {
  /** PENDING-BE (G17) — derived from events + applications until the endpoint ships. */
  dashboard: async (): Promise<CoordinatorDashboard> => {
    try {
      return (await http.get<CoordinatorDashboard>('/coordinator/dashboard')).data;
    } catch (e) {
      if (!isRouteMissing(e)) throw e;
      const events = await opsApi.allEvents();
      const apps = (await Promise.all(events.map((ev) => opsApi.applications(ev.id).catch(() => [] as ShiftAssignment[])))).flat();
      const now = new Date();
      const shifts = events.flatMap((ev) => ev.shifts ?? []);
      const confirmed = (id: number) => apps.filter((a) => a.shift_id === id && a.status === 'confirmed').length;
      return {
        shifts_today: shifts.filter((s) => parseApiDate(s.start_time)?.toDateString() === now.toDateString()).length,
        checked_in_now: null,
        pending_applications: apps.filter((a) => a.status === 'pending').length,
        underfilled_shifts: shifts.filter((s) => (parseApiDate(s.start_time) ?? now) > now && confirmed(s.id) < s.capacity * 0.5).length,
        hours_this_month: null,
        active_volunteers: new Set(apps.filter((a) => a.status === 'confirmed').map((a) => a.volunteer_id)).size,
      };
    }
  },

  events: async (page = 1): Promise<Paginated<VmsEvent>> => {
    const r = await http.get<VmsEvent[]>('/coordinator/events', { query: { page } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 15, total: r.data.length } };
  },
  /** Every event across pages — used by calendar & cross-event application queue. */
  allEvents: async () => {
    const first = await opsApi.events(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.pagination.last_page - 1) }, (_, i) => opsApi.events(i + 2)),
    );
    return [first, ...rest].flatMap((p) => p.items);
  },
  event: async (id: number) => (await http.get<VmsEvent>(`/coordinator/events/${id}`)).data,
  createEvent: async (input: EventInput) => (await http.post<VmsEvent>('/coordinator/events', input)).data,
  updateEvent: async (id: number, input: EventUpdate) => (await http.patch<VmsEvent>(`/coordinator/events/${id}`, input)).data,
  deleteEvent: (id: number) => http.delete(`/coordinator/events/${id}`),

  createShift: async (eventId: number, input: ShiftInput) =>
    (await http.post<Shift>(`/coordinator/events/${eventId}/shifts`, input)).data,
  /** PENDING-BE (G12) */
  updateShift: async (shiftId: number, input: Partial<ShiftInput>) => (await http.patch<Shift>(`/coordinator/shifts/${shiftId}`, input)).data,
  /** PENDING-BE (G12) */
  deleteShift: (shiftId: number) => http.delete(`/coordinator/shifts/${shiftId}`),
  capacity: async (shiftId: number) => (await http.get<ShiftCapacity>(`/coordinator/shifts/${shiftId}/capacity`)).data,

  applications: async (eventId: number) => (await http.get<ShiftAssignment[]>(`/coordinator/events/${eventId}/applications`)).data,
  /** `reason` is PENDING-BE (G15); Laravel ignores it today. */
  decide: async (assignmentId: number, status: 'confirmed' | 'cancelled', reason?: string) =>
    http.post(`/coordinator/applications/${assignmentId}/approve`, { status, ...(reason ? { reason } : {}) }),
  aiFeedback: async (assignmentId: number) =>
    (await http.get<AiFeedback>(`/coordinator/applications/${assignmentId}/ai-feedback`)).raw as unknown as AiFeedback,

  generateQr: async (shiftId: number) => (await http.post<QrCode>(`/coordinator/shifts/${shiftId}/qrcode`)).raw as unknown as QrCode,
  /** `reason` is PENDING-BE; Laravel requires only signature_data. */
  forceCheckIn: (assignmentId: number, signature_data: string, reason?: string) =>
    http.post<Attendance>(`/coordinator/applications/${assignmentId}/force-checkin`, { signature_data, reason }),
  /** PENDING-BE (G13) — falls back to the event's applications (no attendance status) until it ships. */
  roster: async (shiftId: number, eventId?: number): Promise<RosterEntry[]> => {
    try {
      return (await http.get<RosterEntry[]>(`/coordinator/shifts/${shiftId}/attendance`)).data;
    } catch (e) {
      if (!isRouteMissing(e) || eventId == null) throw e;
      const apps = await opsApi.applications(eventId);
      return apps
        .filter((a) => a.shift_id === shiftId && a.status !== 'cancelled' && a.volunteer)
        .map((a) => ({ assignment_id: a.id, status: a.status, volunteer: a.volunteer!, attendance: null }));
    }
  },

  /** PENDING-BE (G14) */
  pendingHours: async () => (await http.get<PendingHours[]>('/coordinator/attendance/pending')).data,
  /** PENDING-BE (G14) */
  verifyHours: (id: number, input: { status: 'verified' | 'adjusted' | 'rejected'; verified_hours?: number | null; note?: string | null }) =>
    http.patch<Attendance>(`/coordinator/attendance/${id}/verify`, input),

  /** PENDING-BE (G16) */
  broadcastPreview: async (shiftId: number) => (await http.get<BroadcastPreview>(`/coordinator/shifts/${shiftId}/broadcast-preview`)).data,
  broadcast: (shiftId: number) => http.post(`/coordinator/shifts/${shiftId}/broadcast`),
};

export const opsKeys = {
  all: ['ops'] as const,
  dashboard: () => [...opsKeys.all, 'dashboard'] as const,
  events: (page: number) => [...opsKeys.all, 'events', page] as const,
  allEvents: () => [...opsKeys.all, 'events', 'all'] as const,
  event: (id: number) => [...opsKeys.all, 'event', id] as const,
  applications: (eventId: number) => [...opsKeys.all, 'applications', eventId] as const,
  aiFeedback: (assignmentId: number) => [...opsKeys.all, 'ai-feedback', assignmentId] as const,
  roster: (shiftId: number) => [...opsKeys.all, 'roster', shiftId] as const,
  capacity: (shiftId: number) => [...opsKeys.all, 'capacity', shiftId] as const,
  pendingHours: () => [...opsKeys.all, 'pending-hours'] as const,
  broadcastPreview: (shiftId: number) => [...opsKeys.all, 'broadcast-preview', shiftId] as const,
};

export const useOpsDashboard = () => useQuery({ queryKey: opsKeys.dashboard(), queryFn: opsApi.dashboard, refetchInterval: 30_000 });
export const useOrgEvents = (page = 1) =>
  useQuery({ queryKey: opsKeys.events(page), queryFn: () => opsApi.events(page), placeholderData: keepPreviousData });
export const useAllOrgEvents = () => useQuery({ queryKey: opsKeys.allEvents(), queryFn: opsApi.allEvents });
export const useOrgEvent = (id: number) => useQuery({ queryKey: opsKeys.event(id), queryFn: () => opsApi.event(id), enabled: Number.isFinite(id) });
export const useEventApplications = (eventId: number) =>
  useQuery({ queryKey: opsKeys.applications(eventId), queryFn: () => opsApi.applications(eventId), enabled: Number.isFinite(eventId) });
export const useAiFeedback = (assignmentId: number | null) =>
  useQuery({ queryKey: opsKeys.aiFeedback(assignmentId ?? 0), queryFn: () => opsApi.aiFeedback(assignmentId!), enabled: assignmentId != null, staleTime: Infinity });
export const useRoster = (shiftId: number, eventId?: number) =>
  useQuery({ queryKey: opsKeys.roster(shiftId), queryFn: () => opsApi.roster(shiftId, eventId), refetchInterval: 10_000, enabled: Number.isFinite(shiftId) });
export const useShiftCapacity = (shiftId: number) => useQuery({ queryKey: opsKeys.capacity(shiftId), queryFn: () => opsApi.capacity(shiftId) });
export const usePendingHours = () => useQuery({ queryKey: opsKeys.pendingHours(), queryFn: opsApi.pendingHours });
export const useBroadcastPreview = (shiftId: number | null) =>
  useQuery({ queryKey: opsKeys.broadcastPreview(shiftId ?? 0), queryFn: () => opsApi.broadcastPreview(shiftId!), enabled: shiftId != null });

/** Applications across every event of the organization — the coordinator's review queue. */
export function useAllApplications(events: VmsEvent[] | undefined) {
  return useQueries({
    queries: (events ?? []).map((e) => ({ queryKey: opsKeys.applications(e.id), queryFn: () => opsApi.applications(e.id) })),
    combine: (results) => ({
      data: results.flatMap((r, i) => (r.data ?? []).map((a) => ({ ...a, event: events![i]! }))),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    }),
  });
}

function useOpsMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: opsKeys.all }) });
}

export const useCreateEvent = () => useOpsMutation(opsApi.createEvent);
export const useUpdateEvent = () => useOpsMutation(({ id, ...input }: EventUpdate & { id: number }) => opsApi.updateEvent(id, input));
export const useDeleteEvent = () => useOpsMutation(opsApi.deleteEvent);
export const useCreateShift = () => useOpsMutation(({ eventId, ...input }: ShiftInput & { eventId: number }) => opsApi.createShift(eventId, input));
export const useUpdateShift = () => useOpsMutation(({ shiftId, ...input }: Partial<ShiftInput> & { shiftId: number }) => opsApi.updateShift(shiftId, input));
export const useDeleteShift = () => useOpsMutation(opsApi.deleteShift);
export const useDecideApplication = () =>
  useOpsMutation(({ assignmentId, status, reason }: { assignmentId: number; status: 'confirmed' | 'cancelled'; reason?: string }) =>
    opsApi.decide(assignmentId, status, reason),
  );
export const useGenerateQr = () => useOpsMutation(opsApi.generateQr);
export const useForceCheckIn = () =>
  useOpsMutation(({ assignmentId, signature, reason }: { assignmentId: number; signature: string; reason?: string }) =>
    opsApi.forceCheckIn(assignmentId, signature, reason),
  );
export const useVerifyHours = () =>
  useOpsMutation(({ id, ...input }: { id: number; status: 'verified' | 'adjusted' | 'rejected'; verified_hours?: number | null; note?: string | null }) =>
    opsApi.verifyHours(id, input),
  );
export const useBroadcast = () => useOpsMutation(opsApi.broadcast);
