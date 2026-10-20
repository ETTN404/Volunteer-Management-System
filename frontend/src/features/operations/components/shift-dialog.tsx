import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import type { Shift, VmsEvent } from '@/shared/types/api';
import { parseApiDate, toApiDateTime } from '@/shared/lib/time';
import { SKILL_CATALOGUE, normalizeSkill } from '@/shared/lib/skills';
import { errorMessage, isApiError } from '@/shared/api/http';
import { Button, DatePicker, Dialog, DialogActions, DialogContent, Field, FormError, InlineAlert, Input, TagInput, TimePicker, notify } from '@/shared/ui';
import { SHIFT_TEMPLATES } from '../event-schema';
import { useCreateShift, useUpdateShift } from '../api';

// Mirrors CreateShiftRequest + the controller's event-boundary rule.
function makeSchema(event: VmsEvent, minCapacity: number) {
  return z
    .object({
      title: z.string().max(100),
      notes: z.string().max(1000),
      date: z.string().min(1, 'Pick a date.'),
      start: z.string().min(1, 'Pick a start time.'),
      end: z.string().min(1, 'Pick an end time.'),
      capacity: z.coerce
        .number()
        .int('Use a whole number.')
        .min(Math.max(1, minCapacity), minCapacity > 1 ? `${minCapacity} volunteers are already confirmed.` : 'At least 1 volunteer.')
        .max(10000),
      required_skills: z.array(z.string().max(100)),
    })
    .refine((v) => v.end > v.start, { path: ['end'], message: 'End must be after start.' })
    .refine((v) => v.date >= event.start_date && v.date <= event.end_date, { path: ['date'], message: `Must be within the event (${event.start_date} – ${event.end_date}).` });
}
type Values = z.infer<ReturnType<typeof makeSchema>>;

export function ShiftDialog({ event, shift, open, onOpenChange }: { event: VmsEvent; shift?: Shift | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateShift();
  const update = useUpdateShift();
  const editing = Boolean(shift);
  const confirmed = shift?.confirmed_count ?? 0;
  const started = shift ? (parseApiDate(shift.start_time) ?? new Date()) < new Date() : false;
  const form = useForm<Values>({ resolver: zodResolver(makeSchema(event, confirmed)) });
  const { register, control, handleSubmit, reset, formState, setError, setValue } = form;

  useEffect(() => {
    if (!open) return;
    create.reset();
    update.reset();
    const s = shift ? parseApiDate(shift.start_time) : null;
    const e = shift ? parseApiDate(shift.end_time) : null;
    reset({
      title: shift?.title ?? '',
      notes: shift?.notes ?? '',
      date: s ? format(s, 'yyyy-MM-dd') : event.start_date,
      start: s ? format(s, 'HH:mm') : '09:00',
      end: e ? format(e, 'HH:mm') : '13:00',
      capacity: shift?.capacity ?? 10,
      required_skills: shift?.required_skills ?? [],
    });
  }, [open, shift, event.start_date, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title.trim() || null,
      notes: v.notes.trim() || null,
      start_time: toApiDateTime(new Date(`${v.date}T${v.start}:00`)),
      end_time: toApiDateTime(new Date(`${v.date}T${v.end}:00`)),
      capacity: v.capacity,
      required_skills: v.required_skills,
    };
    try {
      if (shift) await update.mutateAsync({ shiftId: shift.id, ...payload });
      else await create.mutateAsync({ eventId: event.id, ...payload });
      notify.success(editing ? 'Shift updated' : 'Shift added', `${v.date} · ${v.start}–${v.end} · ${v.capacity} places${editing && confirmed ? ' · volunteers notified of changes' : ''}`);
      onOpenChange(false);
    } catch (e) {
      if (isApiError(e) && e.isValidation) {
        if (e.field('start_time')) setError('start', { message: e.field('start_time') });
        if (e.field('end_time')) setError('end', { message: e.field('end_time') });
        if (e.field('capacity')) setError('capacity', { message: e.field('capacity') });
      }
    }
  });
  const err = create.error ?? update.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? 'Edit shift' : 'Add a shift'} description={event.title} size="lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          {!editing && (
            <div className="flex flex-wrap gap-1.5">
              {SHIFT_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    setValue('title', t.title);
                    setValue('start', t.start);
                    setValue('end', t.end);
                  }}
                  className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
                >
                  {t.label} · {t.start}–{t.end}
                </button>
              ))}
            </div>
          )}
          {editing && confirmed > 0 && (
            <InlineAlert tone="info">
              {confirmed} volunteer{confirmed === 1 ? ' is' : 's are'} confirmed. Changing the time notifies them{started ? '; the start time is locked once check-in has begun' : ''}.
            </InlineAlert>
          )}
          <FormError message={err && !(isApiError(err) && err.isValidation && (err.field('start_time') || err.field('capacity'))) ? errorMessage(err) : null} />
          <Field label="Shift name" optional>
            <Input {...register('title')} placeholder="e.g. Registration desk" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
            <Field label="Date" error={formState.errors.date?.message}>
              <Controller control={control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} min={event.start_date} max={event.end_date} />} />
            </Field>
            <Field label="Starts" error={formState.errors.start?.message}>
              <Controller control={control} name="start" render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field label="Ends" error={formState.errors.end?.message}>
              <Controller control={control} name="end" render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} min={form.getValues('start')} />} />
            </Field>
            <Field label="Places" error={formState.errors.capacity?.message}>
              <Input type="number" min={Math.max(1, confirmed)} {...register('capacity')} />
            </Field>
          </div>
          <Field label="What volunteers will do" optional>
            <Input {...register('notes')} placeholder="e.g. Greet donors and help them fill the form" />
          </Field>
          <Controller
            control={control}
            name="required_skills"
            render={({ field }) => (
              <Field label="Required skills" optional hint="Volunteers are ranked by how many of these they have. Leave empty for open shifts.">
                <TagInput value={field.value ?? []} onChange={field.onChange} suggestions={SKILL_CATALOGUE} normalize={normalizeSkill} max={8} />
              </Field>
            )}
          />
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save shift' : 'Add shift'}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
