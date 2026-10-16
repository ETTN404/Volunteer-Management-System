import { describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import { renderApp } from '@/test/render';
import { DEMO } from '@/test/auth';
import { db } from '@/mocks/db';

const T = { timeout: 10_000 };

describe('organization admin', () => {
  it('saves settings and rejects an invalid website', async () => {
    const { screen, user } = await renderApp('/o/settings', { as: DEMO.orgadmin });
    const website = await screen.findByLabelText(/website/i, {}, T);
    await user.clear(website);
    await user.type(website, 'not a url');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText(/enter a full url/i, {}, T)).toBeInTheDocument();
    await user.clear(website);
    await user.type(website, 'https://redcross.example');
    await user.click(screen.getByRole('button', { name: 'Use #2F8FD8' }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved', {}, T)).toBeInTheDocument();
    expect(db.t.organizations[0]).toMatchObject({ website: 'https://redcross.example', primary_color: '#2F8FD8' });
  });

  it('adds a coordinator', async () => {
    const { screen, user } = await renderApp('/o/team', { as: DEMO.orgadmin });
    await user.click(await screen.findByRole('button', { name: /add a coordinator/i }, T));
    const dialog = await screen.findByRole('dialog', {}, T);
    await user.type(within(dialog).getByLabelText('Full name'), 'Selam Coordinator');
    await user.type(within(dialog).getByLabelText('Email'), 'selam.coord@redcross.org');
    await user.click(within(dialog).getByRole('button', { name: /add coordinator/i }));
    expect(await screen.findByText('Selam Coordinator', {}, T)).toBeInTheDocument();
    expect(db.t.users.some((u) => u.email === 'selam.coord@redcross.org' && u.role === 'Coordinator')).toBe(true);
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

describe('platform admin', () => {
  it('onboards a new organization through the wizard', async () => {
    const { screen, user } = await renderApp('/p/onboard', { as: DEMO.superadmin });
    await user.type(await screen.findByLabelText('Organization name', {}, T), 'Hawassa Youth Volunteers');
    await user.type(screen.getByLabelText(/organization email/i), 'hello@hawassa.org');
    await user.type(screen.getByLabelText('Address'), 'Hawassa, Sidama');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(await screen.findByLabelText(/admin’s full name/i, {}, T), 'Lensa Admin');
    await user.type(screen.getByLabelText(/admin’s email/i), 'lensa@hawassa.org');
    await user.type(screen.getByLabelText(/temporary password/i), 'longpassword');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('button', { name: 'Create organization' }, T));
    expect(await screen.findByRole('heading', { name: /hawassa youth volunteers is live/i }, T)).toBeInTheDocument();
  });

  it('flags a duplicate organization email from the server', async () => {
    const { screen, user } = await renderApp('/p/onboard', { as: DEMO.superadmin });
    await user.type(await screen.findByLabelText('Organization name', {}, T), 'Dup');
    await user.type(screen.getByLabelText(/organization email/i), 'contact@redcross.org');
    await user.type(screen.getByLabelText('Address'), 'Addis');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(await screen.findByLabelText(/admin’s full name/i, {}, T), 'A');
    await user.type(screen.getByLabelText(/admin’s email/i), 'a@dup.org');
    await user.type(screen.getByLabelText(/temporary password/i), 'longpassword');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('button', { name: 'Create organization' }, T));
    expect(await screen.findByText(/org email has already been taken/i, {}, T)).toBeInTheDocument();
  });

  // Suspension goes through Radix Select, which loops in jsdom — covered by e2e/platform.spec.ts instead.

  it('filters the audit trail', async () => {
    const { screen, user } = await renderApp('/p/audit', { as: DEMO.superadmin });
    await screen.findAllByText('Organization onboarded', {}, T);
    await user.type(screen.getByLabelText('Search audit trail'), 'Lalibela');
    await waitFor(() => expect(screen.queryByText('Organization onboarded')).not.toBeInTheDocument(), T);
    expect(screen.getAllByText('Organization status changed').length).toBe(1);
  });
});
