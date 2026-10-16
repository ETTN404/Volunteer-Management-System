import { describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import { renderApp } from '@/test/render';
import { DEMO } from '@/test/auth';
import { db } from '@/mocks/db';
import { eventCreateSchema } from '@/features/operations/event-schema';
import { toApiDate } from '@/shared/lib/time';

const T = { timeout: 10_000 };

describe('event schema (mirrors CreateEventRequest)', () => {
  const base = { title: 'X', location: 'Y', latitude: null, longitude: null, start_date: toApiDate(new Date()), end_date: toApiDate(new Date()), geofence_radius: 100, description: '' };
  it('accepts a valid event', () => expect(eventCreateSchema.safeParse(base).success).toBe(true));
  it('rejects past starts, inverted ranges and tiny geofences', () => {
    expect(eventCreateSchema.safeParse({ ...base, start_date: '2020-01-01', end_date: '2020-01-02' }).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...base, end_date: '2000-01-01' }).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...base, geofence_radius: 10 }).success).toBe(false);
  });
});

describe('coordinator workspace', () => {
  it('shows live operations counts', async () => {
    const { screen } = await renderApp('/c', { as: DEMO.coordinator });
    expect(await screen.findByText('Checked in right now', {}, T)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /open live/i }, T)).toBeInTheDocument();
  });

  it('creates an event and adds its first shift', async () => {
    const { screen, user, router } = await renderApp('/c/events/new', { as: DEMO.coordinator });
    await user.type(await screen.findByLabelText('Event name', {}, T), 'Library clean-up');
    await user.click(screen.getByRole('button', { name: 'Piazza' }));
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/c\/events\/\d+$/), T);
    const dialog = await screen.findByRole('dialog', { name: 'Add a shift' }, T);
    await user.click(within(dialog).getByRole('button', { name: 'Add shift' }));
    expect(await screen.findByText('Shift added', {}, T)).toBeInTheDocument();
    const created = db.t.events.find((e) => e.title === 'Library clean-up')!;
    expect(created.latitude).toBeCloseTo(9.035221);
    expect(db.t.shifts.some((s) => s.event_id === created.id)).toBe(true);
  });

  it('approves an application from the queue', async () => {
    const { screen, user } = await renderApp('/c/applications', { as: DEMO.coordinator });
    const approve = await screen.findAllByRole('button', { name: 'Approve' }, T);
    const before = db.t.assignments.filter((a) => a.status === 'confirmed').length;
    await user.click(approve[0]!);
    expect(await screen.findByText('Approved', { selector: '[data-title]' }, T).catch(() => screen.findAllByText(/approved/i))).toBeTruthy();
    await waitFor(() => expect(db.t.assignments.filter((a) => a.status === 'confirmed').length).toBe(before + 1), T);
  });

  it('declines with a note for the volunteer', async () => {
    const { screen, user } = await renderApp('/c/applications', { as: DEMO.coordinator });
    const decline = await screen.findAllByRole('button', { name: 'Decline' }, T);
    await user.click(decline[0]!);
    const dialog = await screen.findByRole('dialog', {}, T);
    await user.type(within(dialog).getByRole('textbox'), 'This shift needs a nurse.');
    await user.click(within(dialog).getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(db.t.assignments.some((a) => a.decline_reason === 'This shift needs a nurse.')).toBe(true), T);
  });

  it('verifies logged hours', async () => {
    const { screen, user } = await renderApp('/c/hours', { as: DEMO.coordinator });
    const verify = await screen.findAllByRole('button', { name: /verify/i }, T);
    const pendingBefore = db.t.attendances.filter((a) => a.hours_status === 'pending' && a.check_out_time).length;
    await user.click(verify[0]!);
    await waitFor(() => expect(db.t.attendances.filter((a) => a.hours_status === 'pending' && a.check_out_time).length).toBe(pendingBefore - 1), T);
  });

  it('generates an impact report', async () => {
    const { screen, user } = await renderApp('/c/reports', { as: DEMO.coordinator });
    await user.click((await screen.findByText('Generate report', {}, T)).closest('button')!);
    expect(await screen.findByText('Report ready', {}, T)).toBeInTheDocument();
  });

  it('opens the live shift roster with a QR code', async () => {
    const shift = db.t.shifts.find((s) => s.qr_code_signature === 'VT-DEMO-7F3A9C21')!;
    const { screen } = await renderApp(`/c/live/${shift.id}`, { as: DEMO.coordinator });
    expect(await screen.findByRole('heading', { name: 'Roster' }, T)).toBeInTheDocument();
    expect(await screen.findByText(/rotates in/i, {}, T)).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: /manual/i }, T)).length).toBeGreaterThan(0);
  });

  it('sends an urgent alert to matching volunteers', async () => {
    const { screen, user } = await renderApp('/c', { as: DEMO.coordinator });
    await user.click(await screen.findByRole('button', { name: /urgent alert/i }, T));
    const dialog = await screen.findByRole('dialog', {}, T);
    await within(dialog).findByText(/volunteers will be alerted/i, {}, T);
    await user.click(within(dialog).getByRole('button', { name: /send alert/i }));
    expect(await screen.findByText('Alert queued', {}, T)).toBeInTheDocument();
  });

  it('keeps other tenants’ events out of reach', async () => {
    const other = db.t.events.find((e) => e.org_id === 2)!;
    const { screen } = await renderApp(`/c/events/${other.id}`, { as: DEMO.coordinator });
    expect(await screen.findByRole('alert', {}, T)).toHaveTextContent(/no longer exists|not found/i);
  });
});
