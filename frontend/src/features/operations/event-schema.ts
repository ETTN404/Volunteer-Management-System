import { z } from 'zod';
import { toApiDate } from '@/shared/lib/time';

/** Mirrors App\Http\Requests\CreateEventRequest. */
export const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the event a name.').max(150, 'Keep the name under 150 characters.'),
    description: z.string().max(5000, 'Keep the description under 5,000 characters.').optional(),
    location: z.string().trim().min(1, 'Where is it happening?').max(255),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    start_date: z.string().min(1, 'Pick a start date.'),
    end_date: z.string().min(1, 'Pick an end date.'),
    geofence_radius: z.number().int().min(50, 'At least 50 m.').max(5000, 'At most 5,000 m.'),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'End date must be on or after the start date.' });

export const eventCreateSchema = eventSchema.refine((v) => v.start_date >= toApiDate(new Date()), {
  path: ['start_date'],
  message: 'Start date must be today or later.',
});

export type EventFormValues = z.infer<typeof eventSchema>;

/** Addis Ababa venues to start from — one click fills location + pin. */
export const VENUE_PRESETS = [
  { label: 'Meskel Square', location: 'Meskel Square, Kirkos, Addis Ababa', latitude: 9.010733, longitude: 38.761269 },
  { label: 'Bole', location: 'Bole Medhanialem, Bole, Addis Ababa', latitude: 8.996915, longitude: 38.785544 },
  { label: 'Piazza', location: 'Piazza, Arada, Addis Ababa', latitude: 9.035221, longitude: 38.751044 },
  { label: 'Sidist Kilo', location: 'Addis Ababa University, Sidist Kilo', latitude: 9.045011, longitude: 38.762144 },
  { label: 'Merkato', location: 'Merkato, Addis Ketema', latitude: 9.030412, longitude: 38.740188 },
  { label: 'Entoto', location: 'Entoto Park, Gulele', latitude: 9.095012, longitude: 38.770122 },
];
