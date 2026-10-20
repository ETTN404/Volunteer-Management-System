import { z } from 'zod';
import { toApiDate } from '@/shared/lib/time';

/** Mirrors App\Http\Requests\CreateEventRequest. The venue pin is mandatory (it drives GPS check-in). */
export const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the event a name.').max(150, 'Keep the name under 150 characters.'),
    description: z.string().max(5000, 'Keep the description under 5,000 characters.').optional(),
    location: z.string().trim().min(1, 'Name the venue so volunteers can find it.').max(255),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    start_date: z.string().min(1, 'Pick a start date.'),
    end_date: z.string().min(1, 'Pick an end date.'),
    geofence_radius: z.number().int().min(30, 'At least 30 m.').max(5000, 'At most 5,000 m.'),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'End date must be on or after the start date.' })
  .refine((v) => v.latitude != null && v.longitude != null, { path: ['latitude'], message: 'Place the venue pin on the map.' });

export const eventCreateSchema = eventSchema.refine((v) => v.start_date >= toApiDate(new Date()), {
  path: ['start_date'],
  message: 'Start date must be today or later.',
});

export type EventFormValues = z.infer<typeof eventSchema>;

/** A shift being drafted in the event wizard (local times). */
export interface ShiftDraft {
  key: string;
  title: string;
  notes: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  capacity: number;
  required_skills: string[];
}

export const newDraftKey = () => Math.random().toString(36).slice(2, 10);

export function draftProblems(d: ShiftDraft, startDate: string, endDate: string): string | null {
  if (!d.date) return 'Pick a day.';
  if (d.date < startDate || d.date > endDate) return `Day must be within the event (${startDate} – ${endDate}).`;
  if (!d.start || !d.end) return 'Pick start and end times.';
  if (d.end <= d.start) return 'End time must be after the start (overnight shifts: split into two).';
  if (!Number.isInteger(d.capacity) || d.capacity < 1) return 'At least 1 volunteer.';
  return null;
}

export const SHIFT_TEMPLATES: { label: string; title: string; start: string; end: string }[] = [
  { label: 'Morning', title: 'Morning shift', start: '08:00', end: '12:00' },
  { label: 'Afternoon', title: 'Afternoon shift', start: '13:00', end: '17:00' },
  { label: 'Full day', title: 'Full day', start: '08:30', end: '16:30' },
  { label: 'Evening', title: 'Evening shift', start: '17:00', end: '20:00' },
];
