import { describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import { renderApp } from '@/test/render';
import { DEMO } from '@/test/auth';
import { db } from '@/mocks/db';

const T = { timeout: 15_000 };

describe('organization admin', () => {
  it('saves settings, rejects an invalid website and locks Pro branding on Free', async () => {
    db.t.organizations[0]!.subscription_plan = 'free';
    const { screen, user } = await renderApp('/o/settings', { as: DEMO.orgadmin });
    const website = await screen.findByLabelText(/website/i, {}, T);
    await user.clear(website);
    await user.type(website, 'not a url');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText(/enter a full url/i, {}, T)).toBeInTheDocument();
    await user.clear(website);
    await user.type(website, 'https://redcross.example');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved', {}, T)).toBeInTheDocument();
    expect(db.t.organizations[0]).toMatchObject({ website: 'https://redcross.example' });
    expect(screen.getByText(/available on pro/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /check-in & check-out rules/i })).toBeInTheDocument();
  });

  it('invites a coordinator by email — no password is typed', async () => {
    const { screen, user } = await renderApp('/o/team', { as: DEMO.orgadmin });
    await user.click(await screen.findByRole('button', { name: /invite a coordinator/i }, T));
    const dialog = await screen.findByRole('dialog', {}, T);
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('First name'), 'Selam');
    await user.type(within(dialog).getByLabelText('Last name'), 'Bekele');
    await user.type(within(dialog).getByLabelText(/work email/i), 'selam.coord@redcross.org');
    await user.click(within(dialog).getByRole('button', { name: /send invitation/i }));
    expect(await screen.findByText(/invitation sent to selam.coord@redcross.org/i, {}, T)).toBeInTheDocument();
    expect(db.t.users.some((u) => u.email === 'selam.coord@redcross.org' && u.role === 'Coordinator' && u.full_name === 'Selam Bekele')).toBe(true);
  });

  it('pauses a volunteer account', async () => {
    const { screen, user } = await renderApp('/o/members', { as: DEMO.orgadmin });
    const switches = await screen.findAllByRole('switch', {}, T);
    const target = switches.find((s) => s.getAttribute('aria-checked') === 'true')!;
    const name = target.getAttribute('aria-label')!.replace(' account active', '');
    await user.click(target);
    await waitFor(() => expect(db.t.users.find((u) => u.full_name === name)!.is_active).toBe(false), T);
  });
});

async function fillOnboarding(screen: Awaited<ReturnType<typeof renderApp>>['screen'], user: Awaited<ReturnType<typeof renderApp>>['user'], orgEmail: string) {
  await user.type(await screen.findByLabelText('Name', {}, T), 'Hawassa Youth Volunteers');
  await user.type(screen.getByLabelText(/organization email/i), orgEmail);
  // City: free text is allowed when a town is missing from the list.
  await user.click(screen.getByLabelText('City'));
  await user.type(await screen.findByPlaceholderText(/search cities/i, {}, T), 'Hawassa Test Town');
  await user.click(await screen.findByRole('button', { name: /use “hawassa test town”/i }, T));
  await user.type(screen.getByLabelText('Phone'), '911234567');
  await user.type(screen.getByLabelText('First name'), 'Lensa');
  await user.type(screen.getByLabelText('Last name'), 'Admin');
  await user.type(screen.getByLabelText('Email'), 'lensa@hawassa.org');
}

describe('platform admin', () => {
  it('onboards an organization and sends an invitation (country, city, phone with dial code)', async () => {
    const { screen, user } = await renderApp('/p/onboard', { as: DEMO.superadmin });
    await fillOnboarding(screen, user, 'hello@hawassa.org');
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /onboard & send invitation/i }));
    expect(await screen.findByRole('heading', { name: /hawassa youth volunteers is on voluntrack/i }, T)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy invitation link/i })).toBeInTheDocument();
    expect(db.t.organizations.find((o) => o.email === 'hello@hawassa.org')?.phone).toBe('+251911234567');
  });

  it('flags a duplicate organization email from the server', async () => {
    const { screen, user } = await renderApp('/p/onboard', { as: DEMO.superadmin });
    await fillOnboarding(screen, user, 'contact@redcross.org');
    await user.click(screen.getByRole('button', { name: /onboard & send invitation/i }));
    expect((await screen.findAllByText(/already on voluntrack/i, {}, T)).length).toBeGreaterThan(0);
  });

  it('shows a readable audit trail with who did what', async () => {
    const { screen } = await renderApp('/p/audit', { as: DEMO.superadmin });
    expect((await screen.findAllByText('Tenant onboarded', {}, T)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.queryByText(/App\\Models/)).not.toBeInTheDocument();
  });
});
