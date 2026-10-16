import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import type { Shift, VmsEvent } from '@/shared/types/api';
import { parseApiDate, toApiDateTime } from '@/shared/lib/time';
import { SKILL_CATALOGUE, normalizeSkill } from '@/shared/lib/skills';
import { isApiError } from '@/shared/api/http';
import { Button, Dialog, DialogActions, DialogContent, Field, FormError, Input, TagInput, notify } from '@/shared/ui';
import { useCreateShift, useUpdateShift } from '../api';

// Mirrors CreateShiftRequest + the controller's event-boundary rule.
function makeSchema(event: VmsEvent) {
  return z
    .object({
      date: z.string().min(1, 'Pick a date.'),
      start: z.string().min(1, 'Pick a start time.'),
      end: z.string().min(1, 'Pick an end time.'),
      capacity: z.coerce.number().int('Use a whole number.').min(1, 'At least 1 volunteer.').max(10000),
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
  const form = useForm<Values>({ resolver: zodResolver(makeSchema(event)) });
  const { register, control, handleSubmit, reset, formState, setError } = form;

  useEffect(() => {
    if (!open) return;
    const s = shift ? parseApiDate(shift.start_time) : null;
    const e = shift ? parseApiDate(shift.end_time) : null;
    reset({
      date: s ? format(s, 'yyyy-MM-dd') : event.start_date,
      start: s ? format(s, 'HH:mm') : '09:00',
      end: e ? format(e, 'HH:mm') : '13:00',
      capacity: shift?.capacity ?? 10,
      required_skills: shift?.required_skills ?? [],
    });
  }, [open, shift, event.start_date, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      start_time: toApiDateTime(new Date(`${v.date}T${v.start}:00`)),
      end_time: toApiDateTime(new Date(`${v.date}T${v.end}:00`)),
      capacity: v.capacity,
      required_skills: v.required_skills,
    };
    try {
      if (shift) await update.mutateAsync({ shiftId: shift.id, ...payload });
      else await create.mutateAsync({ eventId: event.id, ...payload });
      notify.success(editing ? 'Shift updated' : 'Shift added', `${v.date} · ${v.start}–${v.end} · ${v.capacity} spots`);
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
      <DialogContent title={editing ? 'Edit shift' : 'Add a shift'} description={event.title}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormError message={err && !(isApiError(err) && err.isValidation && (err.field('start_time') || err.field('capacity'))) ? err.message : null} />
          <Field label="Date" error={formState.errors.date?.message}>
            <Input type="date" min={event.start_date} max={event.end_date} {...register('date')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Starts" error={formState.errors.start?.message}>
              <Input type="time" {...register('start')} />
            </Field>
            <Field label="Ends" error={formState.errors.end?.message}>
              <Input type="time" {...register('end')} />
            </Field>
            <Field label="Spots" error={formState.errors.capacity?.message}>
              <Input type="number" min={1} {...register('capacity')} />
            </Field>
          </div>
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
