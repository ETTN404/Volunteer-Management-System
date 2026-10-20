import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, MapPin, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { cn } from '@/shared/lib/cn';
import { toApiDate, toApiDateTime } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { errorMessage, isApiError } from '@/shared/api/http';
import { Button, Card, CardBody, CardHeader, DateRangePicker, ErrorState, Field, FormError, Input, LocationPicker, PageHeader, Skeleton, Textarea, notify } from '@/shared/ui';
import { useCreateEvent, useOrgEvent, useUpdateEvent } from '@/features/operations/api';
import { draftProblems, eventCreateSchema, eventSchema, type EventFormValues, type ShiftDraft } from '@/features/operations/event-schema';
import { ShiftBuilder, emptyDraft } from '@/features/operations/components/shift-builder';

const STEPS = [
  { key: 'basics', label: 'Basics', icon: ClipboardList },
  { key: 'venue', label: 'Venue', icon: MapPin },
  { key: 'shifts', label: 'Shifts', icon: CalendarDays },
  { key: 'review', label: 'Review', icon: Rocket },
] as const;

export default function EventEditorPage() {
  const params = useParams();
  const eventId = params.eventId ? Number(params.eventId) : null;
  const editing = eventId != null;
  const existing = useOrgEvent(eventId ?? NaN);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const navigate = useNavigate();
  const today = toApiDate(new Date());
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<ShiftDraft[]>([]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(editing ? eventSchema : eventCreateSchema),
    defaultValues: { title: '', description: '', location: '', latitude: null, longitude: null, start_date: today, end_date: today, geofence_radius: 100 },
  });
  const { register, control, handleSubmit, reset, watch, setValue, formState, setError, trigger } = form;
  const v = watch();

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
  // First shift suggestion once dates are set.
  useEffect(() => {
    if (!editing && step === 2 && drafts.length === 0) setDrafts([emptyDraft(v.start_date)]);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyServerErrors = (e: unknown) => {
    if (isApiError(e)) for (const [f, m] of Object.entries(e.fieldErrors)) if (!f.startsWith('shifts')) setError(f as keyof EventFormValues, { message: m[0] });
  };

  const save = handleSubmit(async (values) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: eventId!, ...values, latitude: values.latitude!, longitude: values.longitude!, description: values.description || null });
        notify.success('Event saved');
        navigate(`/c/events/${eventId}`);
        return;
      }
      const e = await create.mutateAsync({
        ...values,
        latitude: values.latitude!,
        longitude: values.longitude!,
        description: values.description || null,
        shifts: drafts.map((d) => ({
          title: d.title.trim() || null,
          notes: d.notes.trim() || null,
          start_time: toApiDateTime(new Date(`${d.date}T${d.start}:00`)),
          end_time: toApiDateTime(new Date(`${d.date}T${d.end}:00`)),
          capacity: d.capacity,
          required_skills: d.required_skills,
        })),
      });
      notify.success('Event published', drafts.length ? `${drafts.length} shifts are open for applications.` : 'Add shifts so volunteers can apply.');
      navigate(`/c/events/${e.id}`, { state: drafts.length ? undefined : { addShift: true } });
    } catch (e) {
      applyServerErrors(e);
      if (!editing && isApiError(e) && Object.keys(e.fieldErrors).some((k) => ['title', 'description', 'start_date', 'end_date'].includes(k))) setStep(0);
      else if (!editing && isApiError(e) && Object.keys(e.fieldErrors).some((k) => ['location', 'latitude', 'longitude', 'geofence_radius'].includes(k))) setStep(1);
    }
  });

  if (editing && existing.isLoading) return <Skeleton className="h-[600px] rounded-xl" />;
  if (editing && existing.error) return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />;
  const err = create.error ?? update.error;

  const basics = (
    <div className="space-y-5">
      <Field label="Event name" error={formState.errors.title?.message}>
        <Input {...register('title')} placeholder="e.g. Bole community blood drive" inputSize="lg" />
      </Field>
      <Field label="Dates" error={formState.errors.start_date?.message ?? formState.errors.end_date?.message} hint="One day or several — shifts are planned inside these dates.">
        <DateRangePicker
          value={{ from: v.start_date, to: v.end_date }}
          min={editing ? undefined : today}
          onChange={(r) => {
            setValue('start_date', r.from, { shouldDirty: true });
            setValue('end_date', r.to || r.from, { shouldDirty: true });
          }}
          invalid={Boolean(formState.errors.start_date || formState.errors.end_date)}
        />
      </Field>
      <Field label="Description" optional error={formState.errors.description?.message} hint="What volunteers will do, what to bring, where to meet.">
        <Textarea rows={6} {...register('description')} />
      </Field>
    </div>
  );

  const venue = (
    <div className="space-y-5">
      <Field label="Venue name" error={formState.errors.location?.message} hint="Shown to volunteers — filled in from the address you pick, edit it freely.">
        <Input {...register('location')} placeholder="e.g. Millennium Hall, Gate 3" />
      </Field>
      <Controller
        control={control}
        name="latitude"
        render={() => (
          <LocationPicker
            value={{ location: v.location, latitude: v.latitude, longitude: v.longitude, radius: v.geofence_radius }}
            invalid={Boolean(formState.errors.latitude)}
            onChange={(n) => {
              if (n.location !== v.location) setValue('location', n.location, { shouldDirty: true, shouldValidate: true });
              setValue('latitude', n.latitude, { shouldDirty: true, shouldValidate: Boolean(formState.errors.latitude) });
              setValue('longitude', n.longitude, { shouldDirty: true });
              setValue('geofence_radius', n.radius, { shouldDirty: true });
            }}
          />
        )}
      />
      {formState.errors.latitude && <p className="text-[12.5px] text-danger-text">{formState.errors.latitude.message}</p>}
    </div>
  );

  // ---------------- Edit mode: one page ----------------
  if (editing) {
    return (
      <>
        <Link to={`/c/events/${eventId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" /> Back to event
        </Link>
        <PageHeader eyebrow="Edit event" title={existing.data?.title ?? 'Edit event'} description="Changing the dates is blocked while shifts fall outside them. Volunteers on the shifts are notified of time changes." />
        <form onSubmit={save} noValidate className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Basics" />
            <CardBody>{basics}</CardBody>
          </Card>
          <Card>
            <CardHeader title="Venue & check-in area" />
            <CardBody>{venue}</CardBody>
          </Card>
          <div className="flex justify-end gap-2 lg:col-span-2">
            <FormError message={err && !(isApiError(err) && err.isValidation) ? errorMessage(err) : null} />
            <Button variant="ghost" type="button" onClick={() => navigate(`/c/events/${eventId}`)}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save event
            </Button>
          </div>
        </form>
      </>
    );
  }

  // ---------------- Create mode: wizard ----------------
  const next = async () => {
    const fields: (keyof EventFormValues)[][] = [['title', 'description', 'start_date', 'end_date'], ['location', 'latitude', 'longitude', 'geofence_radius'], [], []];
    const ok = await trigger(fields[step]);
    if (!ok) return;
    if (step === 2 && drafts.some((d) => draftProblems(d, v.start_date, v.end_date))) return notify.error('Fix the highlighted shifts first');
    setStep((s) => Math.min(3, s + 1));
  };

  return (
    <>
      <Link to="/c/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Events
      </Link>
      <PageHeader eyebrow="New event" title="Create an event" description="Four short steps. Volunteers see it as soon as you publish." />

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className={cn('flex w-full flex-col items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors sm:flex-row sm:items-center', i === step ? 'bg-accent-soft text-accent-text' : i < step ? 'text-text hover:bg-surface-2' : 'text-faint')}
            >
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold', i < step ? 'bg-success text-white' : i === step ? 'bg-accent text-accent-fg' : 'bg-surface-2')}>
                {i < step ? <Check className="size-3.5" strokeWidth={3} /> : <s.icon className="size-3.5" />}
              </span>
              <span className="text-[13px] font-medium">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <Card>
          <CardBody className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                {step === 0 && basics}
                {step === 1 && venue}
                {step === 2 && <ShiftBuilder value={drafts} onChange={setDrafts} startDate={v.start_date} endDate={v.end_date} />}
                {step === 3 && <Review values={v} drafts={drafts} />}
              </motion.div>
            </AnimatePresence>
            <FormError message={err && !(isApiError(err) && err.isValidation && Object.keys(err.fieldErrors).every((k) => !k.startsWith('shifts'))) ? errorMessage(err) : null} />
          </CardBody>
        </Card>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft /> Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next}>
              {step === 2 && drafts.length === 0 ? 'Skip — add shifts later' : 'Continue'} <ArrowRight />
            </Button>
          ) : (
            <Button type="button" size="lg" loading={create.isPending} onClick={save}>
              <Rocket /> Publish event
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

function Review({ values, drafts }: { values: EventFormValues; drafts: ShiftDraft[] }) {
  const days = [...new Set(drafts.map((d) => d.date))].sort();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="type-title text-xl text-text wrap-anywhere">{values.title}</h3>
        <p className="mt-1 text-sm text-muted">
          {format(parseISO(values.start_date), 'EEE d MMM yyyy')}
          {values.end_date !== values.start_date && ` – ${format(parseISO(values.end_date), 'EEE d MMM yyyy')}`} · {values.location}
        </p>
        <p className="mt-1 text-[13px] text-faint">
          Check-in area: {values.geofence_radius} m around {values.latitude?.toFixed(5)}, {values.longitude?.toFixed(5)}
        </p>
      </div>
      {drafts.length === 0 ? (
        <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning-text">No shifts yet — volunteers can’t apply until you add at least one.</p>
      ) : (
        days.map((day) => (
          <div key={day}>
            <div className="type-eyebrow mb-2">{format(parseISO(day), 'EEEE d MMMM')}</div>
            <ul className="divide-y divide-line rounded-lg [box-shadow:inset_0_0_0_1px_var(--line)]">
              {drafts
                .filter((d) => d.date === day)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((d) => (
                  <li key={d.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                    <span className="type-data w-28 text-text">
                      {d.start}–{d.end}
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-text">{d.title || 'Shift'}</span>
                    <span className="text-muted">{d.capacity} volunteers</span>
                    {d.required_skills.length > 0 && <span className="w-full text-[12.5px] text-faint sm:w-auto">{d.required_skills.map(humanizeSkill).join(', ')}</span>}
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
