import { describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import { renderApp } from '@/test/render';
import { DEMO } from '@/test/auth';
import { db } from '@/mocks/db';
import { explainCheckInError } from '@/features/volunteer/check-in-errors';
import { ApiError } from '@/shared/api/http';

const T = { timeout: 10_000 };

describe('volunteer portal', () => {
  it('redirects guests to sign in, keeping the destination', { timeout: 60_000 }, async () => {
    const { router, screen } = await renderApp('/v/impact');
    // First route of the file: the lazy login chunk compiles cold, so allow longer.
    expect(await screen.findByRole('heading', { name: /sign in to voluntrack/i }, { timeout: 40_000 })).toBeInTheDocument();
    expect(router.state.location.search).toContain('next=%2Fv%2Fimpact');
  });

  it('blocks other roles from the volunteer workspace', async () => {
    const { router } = await renderApp('/v', { as: DEMO.coordinator });
    await waitFor(() => expect(router.state.location.pathname).toBe('/403'), T);
  });

  it('shows the live shift with an open check-in on home', async () => {
    const { screen } = await renderApp('/v', { as: DEMO.volunteer });
    expect(await screen.findByRole('heading', { name: /good (morning|afternoon|evening)|working late/i }, T)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Meskel Square Blood Drive', level: 2 }, T)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /check in now/i })).toHaveAttribute('href', expect.stringMatching(/\/v\/check-in\/\d+/));
  });

  it('applies for a shift and can withdraw it', async () => {
    const event = db.t.events.find((e) => e.title === 'First Aid Training for Taxi Drivers')!;
    const { screen, user } = await renderApp(`/v/opportunities/${event.id}`, { as: DEMO.volunteer });
    await screen.findByRole('heading', { name: event.title }, T);
    const apply = await screen.findAllByRole('button', { name: 'Apply' }, T);
    await user.click(apply[0]!);
    expect(await screen.findByText('Application sent', {}, T)).toBeInTheDocument();
    const withdraws = await screen.findAllByRole('button', { name: /withdraw/i }, T);
    expect(withdraws.length).toBeGreaterThanOrEqual(2);
  });

  it('checks in with the demo location and code', async () => {
    const shift = db.t.shifts.find((s) => s.qr_code_signature === 'VT-DEMO-7F3A9C21')!;
    const { screen, user } = await renderApp(`/v/check-in/${shift.id}`, { as: DEMO.volunteer });
    await user.click(await screen.findByRole('button', { name: /place me at the venue/i }, T));
    expect(await screen.findByText(/inside the check-in area/i, {}, T)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /type/i }));
    await user.click(await screen.findByRole('button', { name: /use today’s code/i }, T));
    await user.click(screen.getByRole('button', { name: /^check in$/i }));
    expect(await screen.findByRole('heading', { name: /you’re checked in/i }, T)).toBeInTheDocument();
  });

  it('explains a wrong QR code in plain words', async () => {
    const shift = db.t.shifts.find((s) => s.qr_code_signature === 'VT-DEMO-7F3A9C21')!;
    const { screen, user } = await renderApp(`/v/check-in/${shift.id}`, { as: DEMO.volunteer });
    await user.click(await screen.findByRole('button', { name: /place me at the venue/i }, T));
    await user.click(screen.getByRole('radio', { name: /type/i }));
    await user.type(await screen.findByLabelText('QR code', {}, T), 'old-code');
    await user.click(screen.getByRole('button', { name: /^check in$/i }));
    const alert = await screen.findByRole('alert', {}, T);
    expect(within(alert).getByText(/that qr code isn’t current/i)).toBeInTheDocument();
  });

  it('saves profile skills', async () => {
    const { screen, user } = await renderApp('/v/profile', { as: DEMO.volunteer });
    const save = await screen.findByRole('button', { name: /save profile/i }, T);
    await user.click(await screen.findByRole('button', { name: /^medical$/i }, T));
    await user.click(save);
    expect(await screen.findByText('Profile saved', {}, T)).toBeInTheDocument();
    expect(db.t.volunteers[0]!.skills).toContain('medical');
  });

  it('lists earned and locked certificates', async () => {
    const { screen } = await renderApp('/v/certificates', { as: DEMO.volunteer });
    expect(await screen.findByText('VMS-00002', {}, T)).toBeInTheDocument();
    expect(screen.getByText('Still to earn')).toBeInTheDocument();
    expect(screen.getAllByText(/3\.5 h to go/).length).toBeGreaterThan(0);
  });
});

describe('check-in error guidance', () => {
  const err = (code: string, status = 422, extra: Record<string, unknown> = {}) => new ApiError({ message: 'server message', status, kind: 'http', body: { code, ...extra } });
  it.each([
    ['clock_drift', 'drift'],
    ['not_confirmed', 'not-approved'],
    ['already_checked_in', 'already'],
    ['already_checked_out', 'checked-out'],
    ['outside_window', 'window'],
    ['qr_invalid', 'qr'],
    ['gps_inaccurate', 'gps'],
    ['outside_geofence', 'location'],
  ])('maps code "%s"', (code, kind) => {
    expect(explainCheckInError(err(code)).kind).toBe(kind);
  });
  it('rounds the distance into the title', () => {
    expect(explainCheckInError(err('outside_geofence', 422, { distance_m: 212.4 })).title).toBe('You’re 212 m from the venue');
  });
  it('handles rate limiting', () => {
    expect(explainCheckInError(err('', 429)).kind).toBe('rate');
  });
});
