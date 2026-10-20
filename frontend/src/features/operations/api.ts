/**
 * Coordinator operations: events, shifts, applications, live attendance, hours, broadcasts.
 * Endpoints are shared by Coordinator and OrgAdmin roles.
 */
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type {
  AiFeedback,
  Attendance,
  CoordinatorDashboard,
  EventStatus,
  Paginated,
  QrCode,
  RosterEntry,
  RosterMeta,
  Shift,
  ShiftAssignment,
  ShiftCapacity,
  VmsEvent,
  Volunteer,
} from '@/shared/types/api';

export interface ShiftInput {
  title?: string | null;
  notes?: string | null;
  /** `Y-m-d H:i:s` UTC — use toApiDateTime() */
  start_time: string;
  end_time: string;
  required_skills: string[];
  capacity: number;
}

export interface EventInput {
  title: string;
  description?: string | null;
  location: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  geofence_radius?: number | null;
  /** Created in the same request (event wizard). */
  shifts?: ShiftInput[];
}

export type EventUpdate = Partial<Omit<EventInput, 'shifts'>> & { status?: EventStatus; cancel_reason?: string };

export interface PendingHours extends Attendance {
  volunteer: Volunteer;
  hours: number;
  scheduled_hours: number;
  shift: Shift & { event: { id: number; title: string; location: string } };
}

export interface BroadcastPreview {
  matching_volunteers: number;
  remaining_slots: number;
  sample: { id: number; full_name: string; skills: string[] }[];
  plan?: { used: number; limit: number | null } | null;
}

export interface ReplacementCandidate {
  volunteer: Volunteer;
  match_score: number;
  applied: string | null;
}

export interface RotatingQr {
  token: string;
  period_seconds: number;
  rotates_at: string;
  valid_until: string;
}

export const opsApi = {
  dashboard: async () => (await http.get<CoordinatorDashboard>('/coordinator/dashboard')).data,

  events: async (page = 1, query: { q?: string; status?: string } = {}): Promise<Paginated<VmsEvent>> => {
    const r = await http.get<VmsEvent[]>('/coordinator/events', { query: { page, ...query } });
    return { items: r.data, pagination: r.pagination ?? { current_page: 1, last_page: 1, per_page: 15, total: r.data.length } };
  },
  /** Every event across pages — used by calendar & cross-event application queue. */
  allEvents: async () => {
    const r = await http.get<VmsEvent[]>('/coordinator/events', { query: { page: 1, per_page: 100 } });
    const last = r.pagination?.last_page ?? 1;
    const rest = await Promise.all(Array.from({ length: Math.max(0, last - 1) }, (_, i) => opsApi.events(i + 2)));
    return [r.data, ...rest.map((p) => p.items)].flat();
  },
  event: async (id: number) => (await http.get<VmsEvent>(`/coordinator/events/${id}`)).data,
  createEvent: async (input: EventInput) => (await http.post<VmsEvent>('/coordinator/events', input)).data,
  updateEvent: async (id: number, input: EventUpdate) => (await http.patch<VmsEvent>(`/coordinator/events/${id}`, input)).data,
  deleteEvent: (id: number) => http.delete(`/coordinator/events/${id}`),

  createShift: async (eventId: number, input: ShiftInput) => (await http.post<Shift>(`/coordinator/events/${eventId}/shifts`, input)).data,
  updateShift: async (shiftId: number, input: Partial<ShiftInput>) => (await http.patch<Shift>(`/coordinator/shifts/${shiftId}`, input)).data,
  deleteShift: async (shiftId: number, reason?: string) => {
    const r = await http.delete<{ volunteers_notified: number }>(`/coordinator/shifts/${shiftId}`, { body: reason ? { reason } : undefined });
    return { notified: r.data?.volunteers_notified ?? 0, message: r.message };
  },
  capacity: async (shiftId: number) => (await http.get<ShiftCapacity>(`/coordinator/shifts/${shiftId}/capacity`)).data,

  applications: async (eventId: number) => (await http.get<ShiftAssignment[]>(`/coordinator/events/${eventId}/applications`)).data,
  decide: async (assignmentId: number, status: 'confirmed' | 'rejected', reason?: string) =>
    http.post(`/coordinator/applications/${assignmentId}/approve`, { status, ...(reason ? { reason } : {}) }),
  removeFromShift: (assignmentId: number, reason: string) => http.post(`/coordinator/applications/${assignmentId}/remove`, { reason }),
  aiFeedback: async (assignmentId: number) =>
    (await http.get<AiFeedback>(`/coordinator/applications/${assignmentId}/ai-feedback`)).raw as unknown as AiFeedback,

  /** Rotating token for the coordinator's screen (changes every period_seconds). */
  qr: async (shiftId: number): Promise<RotatingQr> => {
    const r = await http.get<RotatingQr>(`/coordinator/shifts/${shiftId}/qrcode`, { silent: true });
    const raw = r.raw as unknown as QrCode;
    return r.data?.token ? r.data : { token: raw.qr_code_signature, period_seconds: 30, rotates_at: raw.expires_at, valid_until: raw.expires_at };
  },
  roster: async (shiftId: number) => {
    const r = await http.get<RosterEntry[]>(`/coordinator/shifts/${shiftId}/attendance`, { silent: true });
    return { entries: r.data, meta: r.raw.meta as RosterMeta | undefined };
  },
  candidates: async (shiftId: number) => (await http.get<ReplacementCandidate[]>(`/coordinator/shifts/${shiftId}/candidates`)).data,
  assign: async (shiftId: number, input: { volunteer_id: number; note?: string; replace_assignment_id?: number }) =>
    (await http.post<ShiftAssignment>(`/coordinator/shifts/${shiftId}/assign`, input)).data,

  /** Manual check-in for people without a phone / data / GPS. */
  forceCheckIn: (assignmentId: number, input: { signature_data?: string; id_verified?: boolean; note?: string }) =>
    http.post<Attendance>(`/coordinator/applications/${assignmentId}/force-checkin`, input),
  staffCheckOut: (attendanceId: number, input: { reason?: string } = {}) => http.post<Attendance>(`/coordinator/attendance/${attendanceId}/check-out`, input),

  pendingHours: async (status: 'pending' | 'verified' | 'adjusted' | 'rejected' | 'all' = 'pending') =>
    (await http.get<PendingHours[]>('/coordinator/attendance/pending', { query: { status } })).data,
  verifyHours: (id: number, input: { status: 'verified' | 'adjusted' | 'rejected'; verified_hours?: number | null; note?: string | null }) =>
    http.patch<Attendance>(`/coordinator/attendance/${id}/verify`, input),

  broadcastPreview: async (shiftId: number) => (await http.get<BroadcastPreview>(`/coordinator/shifts/${shiftId}/broadcast-preview`)).data,
  broadcast: async (shiftId: number) => {
    const r = await http.post<{ notified: number }>(`/coordinator/shifts/${shiftId}/broadcast`);
    return { notified: r.data?.notified ?? 0, message: r.message };
  },
};

export const opsKeys = {
  all: ['ops'] as const,
  dashboard: () => [...opsKeys.all, 'dashboard'] as const,
  events: (page: number, q: object) => [...opsKeys.all, 'events', page, q] as const,
  allEvents: () => [...opsKeys.all, 'events', 'all'] as const,
  event: (id: number) => [...opsKeys.all, 'event', id] as const,
  applications: (eventId: number) => [...opsKeys.all, 'applications', eventId] as const,
  aiFeedback: (assignmentId: number) => [...opsKeys.all, 'ai-feedback', assignmentId] as const,
  roster: (shiftId: number) => [...opsKeys.all, 'roster', shiftId] as const,
  qr: (shiftId: number) => [...opsKeys.all, 'qr', shiftId] as const,
  candidates: (shiftId: number) => [...opsKeys.all, 'candidates', shiftId] as const,
  capacity: (shiftId: number) => [...opsKeys.all, 'capacity', shiftId] as const,
  pendingHours: (status: string) => [...opsKeys.all, 'pending-hours', status] as const,
  broadcastPreview: (shiftId: number) => [...opsKeys.all, 'broadcast-preview', shiftId] as const,
};

export const useOpsDashboard = () => useQuery({ queryKey: opsKeys.dashboard(), queryFn: opsApi.dashboard, refetchInterval: 30_000 });
export const useOrgEvents = (page = 1, query: { q?: string; status?: string } = {}) =>
  useQuery({ queryKey: opsKeys.events(page, query), queryFn: () => opsApi.events(page, query), placeholderData: keepPreviousData });
export const useAllOrgEvents = () => useQuery({ queryKey: opsKeys.allEvents(), queryFn: opsApi.allEvents });
export const useOrgEvent = (id: number) => useQuery({ queryKey: opsKeys.event(id), queryFn: () => opsApi.event(id), enabled: Number.isFinite(id) });
export const useEventApplications = (eventId: number) =>
  useQuery({ queryKey: opsKeys.applications(eventId), queryFn: () => opsApi.applications(eventId), enabled: Number.isFinite(eventId) });
export const useAiFeedback = (assignmentId: number | null) =>
  useQuery({ queryKey: opsKeys.aiFeedback(assignmentId ?? 0), queryFn: () => opsApi.aiFeedback(assignmentId!), enabled: assignmentId != null, staleTime: Infinity });
export const useRoster = (shiftId: number) =>
  useQuery({ queryKey: opsKeys.roster(shiftId), queryFn: () => opsApi.roster(shiftId), refetchInterval: 8_000, enabled: Number.isFinite(shiftId) });
/** Polls the rotating QR a few seconds before each rotation. */
export const useRotatingQr = (shiftId: number, enabled = true) =>
  useQuery({
    queryKey: opsKeys.qr(shiftId),
    queryFn: () => opsApi.qr(shiftId),
    enabled: enabled && Number.isFinite(shiftId),
    refetchInterval: (q) => {
      const next = q.state.data ? new Date(q.state.data.rotates_at).getTime() - Date.now() : 5_000;
      return Math.max(1_000, Math.min(30_000, next + 300));
    },
    refetchIntervalInBackground: true,
  });
export const useReplacementCandidates = (shiftId: number | null) =>
  useQuery({ queryKey: opsKeys.candidates(shiftId ?? 0), queryFn: () => opsApi.candidates(shiftId!), enabled: shiftId != null });
export const useShiftCapacity = (shiftId: number) => useQuery({ queryKey: opsKeys.capacity(shiftId), queryFn: () => opsApi.capacity(shiftId) });
export const usePendingHours = (status: 'pending' | 'verified' | 'adjusted' | 'rejected' | 'all' = 'pending') =>
  useQuery({ queryKey: opsKeys.pendingHours(status), queryFn: () => opsApi.pendingHours(status) });
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
export const useDeleteShift = () => useOpsMutation(({ shiftId, reason }: { shiftId: number; reason?: string }) => opsApi.deleteShift(shiftId, reason));
export const useDecideApplication = () =>
  useOpsMutation(({ assignmentId, status, reason }: { assignmentId: number; status: 'confirmed' | 'rejected'; reason?: string }) =>
    opsApi.decide(assignmentId, status, reason),
  );
export const useRemoveFromShift = () =>
  useOpsMutation(({ assignmentId, reason }: { assignmentId: number; reason: string }) => opsApi.removeFromShift(assignmentId, reason));
export const useAssignVolunteer = () =>
  useOpsMutation(({ shiftId, ...input }: { shiftId: number; volunteer_id: number; note?: string; replace_assignment_id?: number }) => opsApi.assign(shiftId, input));
export const useForceCheckIn = () =>
  useOpsMutation(({ assignmentId, ...input }: { assignmentId: number; signature_data?: string; id_verified?: boolean; note?: string }) =>
    opsApi.forceCheckIn(assignmentId, input),
  );
export const useStaffCheckOut = () =>
  useOpsMutation(({ attendanceId, reason }: { attendanceId: number; reason?: string }) => opsApi.staffCheckOut(attendanceId, { reason }));
export const useVerifyHours = () =>
  useOpsMutation(({ id, ...input }: { id: number; status: 'verified' | 'adjusted' | 'rejected'; verified_hours?: number | null; note?: string | null }) =>
    opsApi.verifyHours(id, input),
  );
export const useBroadcast = () => useOpsMutation(opsApi.broadcast);
