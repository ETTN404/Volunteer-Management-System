import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';

export const ACCOUNTS = {
  volunteer: 'redcross.vol@vms.com',
  coordinator: 'redcross.coord@vms.com',
  orgadmin: 'redcross.admin@vms.com',
  superadmin: 'superadmin@vms.com',
} as const;

export async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email or full name').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: /^sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

/** Fails on serious/critical WCAG A/AA violations. */
export async function expectAccessible(page: Page, opts: { exclude?: string[] } = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  for (const sel of opts.exclude ?? []) builder = builder.exclude(sel);
  const results = await builder.analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Fresh mock database + session for every test.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('vt-e2e-init')) {
        localStorage.clear();
        sessionStorage.setItem('vt-e2e-init', '1');
      }
    });
    await use(page);
  },
});
export { expect };
