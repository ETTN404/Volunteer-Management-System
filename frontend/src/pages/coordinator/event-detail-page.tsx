import { ArrowLeft, CalendarDays, Clock, MapPin, MoreHorizontal, Pencil, Plus, Radar, Ruler, Siren, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import type { EventStatus, Shift } from '@/shared/types/api';
import { formatDate, formatDay, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import {
  Button,
  Card,
  CapacityMeter,
  Dialog,
  DialogActions,
  DialogContent,
  EmptyState,
  ErrorState,
  EventStatusBadge,
  InlineAlert,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  VenueMap,
  notify,
} from '@/shared/ui';
import { useDeleteEvent, useDeleteShift, useEventApplications, useOrgEvent, useUpdateEvent } from '@/features/operations/api';
import { ShiftDialog } from '@/features/operations/components/shift-dialog';
import { BroadcastDialog } from '@/features/operations/components/broadcast-dialog';
import { ApplicationsTable } from '@/features/operations/components/applications-table';

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Live (ongoing)' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EventDetailPage() {
  const eventId = Number(useParams().eventId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const event = useOrgEvent(eventId);
  const apps = useEventApplications(eventId);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const deleteShift = useDeleteShift();
  const [tab, setTab] = useState(params.get('tab') ?? 'shifts');
  const [shiftDialog, setShiftDialog] = useState<{ open: boolean; shift: Shift | null }>({ open: false, shift: null });
  const location = useLocation();
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wantsShift = useRef(Boolean((location.state as { addShift?: boolean } | null)?.addShift));
  const [broadcastShift, setBroadcastShift] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (event.data) document.title = `${event.data.title} · VolunTrack`;
  }, [event.data]);
  // Freshly created events open the "Add a shift" dialog once the event has loaded.
  useEffect(() => {
    if (!event.data || !wantsShift.current) return;
    wantsShift.current = false;
    openTimer.current = setTimeout(() => setShiftDialog({ open: true, shift: null }), 350);
  }, [event.data]);
  useEffect(() => () => clearTimeout(openTimer.current), []);

  if (event.isLoading) return <Skeleton className="h-[560px] rounded-xl" />;
  if (event.error || !event.data) return <ErrorState error={event.error} onRetry={() => event.refetch()} />;
  const e = event.data;
  const shifts = [...(e.shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const pending = (apps.data ?? []).filter((a) => a.status === 'pending').length;
  const hasPin = e.coordinates.latitude != null && e.coordinates.longitude != null;

  return (
    <>
      <Link to="/c/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Events
      </Link>
      <PageHeader
        eyebrow={<EventStatusBadge status={e.status} size="sm" />}
        title={e.title}
        actions={
          <>
            <div className="w-44">
              <Select
                aria-label="Event status"
                size="sm"
                value={e.status}
                onValueChange={(v) =>
                  updateEvent.mutate({ id: e.id, status: v as EventStatus }, { onSuccess: () => notify.success('Status updated', STATUS_OPTIONS.find((o) => o.value === v)?.label), onError: (err) => notify.error(err) })
                }
                options={STATUS_OPTIONS}
              />
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link to={`/c/events/${e.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => setBroadcastShift(shifts[0]?.id ?? null)} disabled={!shifts.length}>
                  <Siren /> Send urgent alert
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete event
                </MenuItem>
              </MenuContent>
            </Menu>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-faint" />
            {formatDate(e.start_date, 'EEE d MMM')} – {formatDate(e.end_date, 'EEE d MMM yyyy')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-faint" /> {e.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-4 text-faint" /> Geofence {e.geofence_radius} m
          </span>
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList
          value={tab}
          layoutId="event-tabs"
          className="mb-6"
          tabs={[
            { value: 'shifts', label: 'Shifts', count: shifts.length },
            { value: 'applications', label: 'Applications', count: pending || undefined },
            { value: 'overview', label: 'Venue & details' },
          ]}
        />

        <TabsContent value="shifts" className="outline-none">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShiftDialog({ open: true, shift: null })}>
              <Plus /> Add shift
            </Button>
          </div>
          {shifts.length === 0 ? (
            <EmptyState icon={<Clock />} title="No shifts yet" description="Add at least one shift so volunteers can apply." action={<Button onClick={() => setShiftDialog({ open: true, shift: null })}>Add the first shift</Button>} />
          ) : (
            <div className="space-y-3">
              {shifts.map((s) => {
                const start = parseApiDate(s.start_time)!;
                const end = parseApiDate(s.end_time)!;
                const live = start <= new Date() && end > new Date();
                return (
                  <Card key={s.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[15px] font-medium text-text">
                        {formatDay(s.start_time)} · {formatTimeRange(s.start_time, s.end_time)}
                        {live && <span className="size-2 animate-pulse rounded-full bg-success" aria-label="Live" />}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.required_skills.length ? (
                          s.required_skills.map((k) => (
                            <span key={k} className="rounded-md bg-surface-2 px-2 py-1 text-[11.5px] text-muted">
                              {humanizeSkill(k)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12.5px] text-faint">No skills required</span>
                        )}
                      </div>
                    </div>
                    <CapacityMeter confirmed={s.confirmed_count} capacity={s.capacity} className="w-full md:w-48" />
                    <div className="flex items-center gap-1.5">
                      <Button asChild size="sm" variant={live ? 'primary' : 'secondary'}>
                        <Link to={`/c/live/${s.id}`}>
                          <Radar /> {live ? 'Live' : 'QR & roster'}
                        </Link>
                      </Button>
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label="Shift actions">
                            <MoreHorizontal />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem onSelect={() => setShiftDialog({ open: true, shift: s })}>
                            <Pencil /> Edit shift
                          </MenuItem>
                          <MenuItem onSelect={() => setBroadcastShift(s.id)}>
                            <Siren /> Urgent alert
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem danger onSelect={() => setDeletingShift(s)}>
                            <Trash2 /> Delete shift
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="outline-none">
          <ApplicationsTable rows={(apps.data ?? []).map((a) => ({ ...a, event: e }))} isLoading={apps.isLoading} showEvent={false} />
        </TabsContent>

        <TabsContent value="overview" className="outline-none">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="p-6">
              <h2 className="type-eyebrow mb-3">Description</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-text">{e.description || 'No description yet.'}</p>
            </Card>
            {hasPin ? (
              <VenueMap venue={{ latitude: e.coordinates.latitude!, longitude: e.coordinates.longitude! }} radius={e.geofence_radius} className="h-[360px]" label={e.location.split(',')[0]} />
            ) : (
              <InlineAlert tone="info">This event has no map pin, so check-in won’t verify GPS location.</InlineAlert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ShiftDialog event={e} shift={shiftDialog.shift} open={shiftDialog.open} onOpenChange={(o) => setShiftDialog((s) => ({ ...s, open: o }))} />
      <BroadcastDialog events={[e]} open={broadcastShift != null} initialShiftId={broadcastShift ?? undefined} onOpenChange={(o) => !o && setBroadcastShift(null)} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title={`Delete “${e.title}”?`} description="Its shifts and pending applications are removed. Attendance already logged stays in volunteers’ records." size="sm">
          {deleteEvent.error && <InlineAlert tone="danger">{errorMessage(deleteEvent.error)}</InlineAlert>}
          <DialogActions>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep event
            </Button>
            <Button
              variant="danger"
              loading={deleteEvent.isPending}
              onClick={() =>
                deleteEvent.mutate(e.id, {
                  onSuccess: () => {
                    notify.success('Event deleted');
                    navigate('/c/events');
                  },
                })
              }
            >
              Delete event
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingShift)} onOpenChange={(o) => !o && setDeletingShift(null)}>
        <DialogContent title="Delete this shift?" description={deletingShift ? `${formatDay(deletingShift.start_time)} · ${formatTimeRange(deletingShift.start_time, deletingShift.end_time)}` : undefined} size="sm">
          <p className="text-sm text-muted">Volunteers who applied are removed from it.</p>
          {deleteShift.error && <InlineAlert tone="danger" className="mt-3">{errorMessage(deleteShift.error)}</InlineAlert>}
          <DialogActions>
            <Button variant="ghost" onClick={() => setDeletingShift(null)}>
              Keep shift
            </Button>
            <Button
              variant="danger"
              loading={deleteShift.isPending}
              onClick={() =>
                deletingShift &&
                deleteShift.mutate(deletingShift.id, {
                  onSuccess: () => {
                    notify.success('Shift deleted');
                    setDeletingShift(null);
                  },
                })
              }
            >
              Delete shift
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
