import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Crosshair, Info } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { toApiDate } from '@/shared/lib/time';
import { formatCoordinate } from '@/shared/lib/geo';
import { isApiError } from '@/shared/api/http';
import { Button, Card, CardBody, CardHeader, ErrorState, Field, FormError, Input, PageHeader, Skeleton, Slider, Textarea, VenueMap, notify } from '@/shared/ui';
import { useCreateEvent, useOrgEvent, useUpdateEvent } from '@/features/operations/api';
import { VENUE_PRESETS, eventCreateSchema, eventSchema, type EventFormValues } from '@/features/operations/event-schema';

const DEFAULT_CENTER = { latitude: 9.010733, longitude: 38.761269 };

export default function EventEditorPage() {
  const params = useParams();
  const eventId = params.eventId ? Number(params.eventId) : null;
  const editing = eventId != null;
  const existing = useOrgEvent(eventId ?? NaN);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const navigate = useNavigate();
  const today = toApiDate(new Date());

  const form = useForm<EventFormValues>({
    resolver: zodResolver(editing ? eventSchema : eventCreateSchema),
    defaultValues: { title: '', description: '', location: '', latitude: null, longitude: null, start_date: today, end_date: today, geofence_radius: 100 },
  });
  const { register, control, handleSubmit, reset, watch, setValue, formState, setError } = form;
  const lat = watch('latitude');
  const lng = watch('longitude');
  const radius = watch('geofence_radius');

  useEffect(() => {
    document.title = `${editing ? 'Edit' : 'New'} event · VolunTrack`;
  }, [editing]);
  useEffect(() => {
    const e = existing.data;
    if (e)
      reset({
        title: e.title,
        description: e.description ?? '',
        location: e.location,
        latitude: e.coordinates.latitude,
        longitude: e.coordinates.longitude,
        start_date: e.start_date,
        end_date: e.end_date,
        geofence_radius: e.geofence_radius,
      });
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (editing) {
        // UpdateEventRequest accepts dates/coords, but the controller only persists these fields.
        await update.mutateAsync({ id: eventId!, title: v.title, description: v.description || null, location: v.location, geofence_radius: v.geofence_radius });
        notify.success('Event saved');
        navigate(`/c/events/${eventId}`);
      } else {
        const e = await create.mutateAsync({ ...v, description: v.description || null });
        notify.success('Event created', 'Now add the shifts volunteers can apply for.');
        navigate(`/c/events/${e.id}`, { state: { addShift: true } });
      }
    } catch (e) {
      if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof EventFormValues, { message: m[0] });
    }
  });

  if (editing && existing.isLoading) return <Skeleton className="h-[600px] rounded-xl" />;
  if (editing && existing.error) return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />;
  const err = create.error ?? update.error;

  return (
    <>
      <Link to={editing ? `/c/events/${eventId}` : '/c/events'} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {editing ? 'Back to event' : 'Events'}
      </Link>
      <PageHeader eyebrow={editing ? 'Edit event' : 'New event'} title={editing ? existing.data?.title ?? 'Edit event' : 'Create an event'} description="Volunteers will check in from inside the geofence you set on the map." />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-5">
              <Field label="Event name" error={formState.errors.title?.message}>
                <Input {...register('title')} placeholder="Meskel Square Blood Drive" autoFocus={!editing} />
              </Field>
              <Field label="Description" optional hint="What volunteers will do, what to bring, who to ask for." error={formState.errors.description?.message}>
                <Textarea rows={5} {...register('description')} />
              </Field>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="When" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Starts" error={formState.errors.start_date?.message}>
                  <Input type="date" min={editing ? undefined : today} disabled={editing} {...register('start_date')} />
                </Field>
                <Field label="Ends" error={formState.errors.end_date?.message}>
                  <Input type="date" min={watch('start_date')} disabled={editing} {...register('end_date')} />
                </Field>
              </div>
              {editing && (
                <p className="flex items-start gap-2 text-[12.5px] text-faint">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> Dates and the map pin are fixed once an event is created. Edit shift times from the event page.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-24 lg:self-start">
          <CardHeader title="Where" description={editing ? undefined : 'Pick a venue or click the map to drop the pin.'} />
          <CardBody className="space-y-5">
            <Field label="Location name" error={formState.errors.location?.message}>
              <Input {...register('location')} placeholder="Meskel Square, Kirkos, Addis Ababa" />
            </Field>
            {!editing && (
              <div className="flex flex-wrap gap-1.5">
                {VENUE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setValue('location', p.location, { shouldDirty: true, shouldValidate: true });
                      setValue('latitude', p.latitude, { shouldDirty: true });
                      setValue('longitude', p.longitude, { shouldDirty: true });
                    }}
                    className={cn('rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors [box-shadow:inset_0_0_0_1px_var(--line)] hover:bg-surface-2', lat === p.latitude ? 'bg-accent-soft text-accent-text' : 'text-muted')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <VenueMap
                venue={lat != null && lng != null ? { latitude: lat, longitude: lng } : DEFAULT_CENTER}
                radius={radius}
                showVenue={lat != null && lng != null}
                className="h-[320px]"
                onPick={
                  editing
                    ? undefined
                    : (p) => {
                        setValue('latitude', Math.round(p.latitude * 1e6) / 1e6, { shouldDirty: true });
                        setValue('longitude', Math.round(p.longitude * 1e6) / 1e6, { shouldDirty: true });
                      }
                }
              />
              <div className="type-data pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-md bg-raised/85 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur">
                <Crosshair className="size-3.5 text-accent-text" />
                {lat != null && lng != null ? `${formatCoordinate(lat, 'lat')} ${formatCoordinate(lng, 'lng')}` : 'No pin — GPS check won’t apply'}
              </div>
            </div>
            <Controller
              control={control}
              name="geofence_radius"
              render={({ field }) => (
                <Field label={`Check-in radius · ${field.value} m`} hint="Volunteers must be inside this circle to check in. 100–200 m suits most venues." error={formState.errors.geofence_radius?.message}>
                  <div className="pt-1">
                    <Slider min={50} max={1000} step={10} value={[field.value]} onValueChange={([v]) => field.onChange(v)} aria-label="Geofence radius" />
                  </div>
                </Field>
              )}
            />
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3 lg:col-span-2">
          <FormError message={err && !(isApiError(err) && err.isValidation) ? err.message : null} />
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" loading={create.isPending || update.isPending}>
            {editing ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      </form>
    </>
  );
}
