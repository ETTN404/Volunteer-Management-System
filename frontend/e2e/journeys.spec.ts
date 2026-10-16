import { ACCOUNTS, expect, expectAccessible, signIn, test } from './fixtures';

test.describe('role journeys', () => {
  for (const [email, path, heading] of [
    [ACCOUNTS.volunteer, '/v', /good (morning|afternoon|evening)|working late/i],
    [ACCOUNTS.coordinator, '/c', /good (morning|afternoon|evening)|working late/i],
    [ACCOUNTS.orgadmin, '/o', 'Red Cross Ethiopia'],
    [ACCOUNTS.superadmin, '/p', 'Every organization, one view'],
  ] as const) {
    test(`${email} lands in ${path}`, async ({ page }) => {
      await signIn(page, email);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    });
  }

  test('volunteer checks in at the venue and checks out with hours', async ({ page }) => {
    await signIn(page, ACCOUNTS.volunteer);
    await page.getByRole('link', { name: /check in now/i }).click();
    await page.getByRole('button', { name: /place me at the venue/i }).click();
    await expect(page.getByText(/inside the check-in area/i)).toBeVisible();
    await page.getByRole('radio', { name: 'Type' }).click();
    await page.getByRole('button', { name: /use today’s blood-drive code/i }).click();
    await page.getByRole('button', { name: /^check in$/i }).click();
    await expect(page.getByRole('heading', { name: /you’re checked in/i })).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: /check out/i }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /^check out$/i }).click();
    await expect(page.getByRole('heading', { name: /thank you for your service/i })).toBeVisible();
  });

  test('coordinator runs a live shift and checks someone in manually', async ({ page }) => {
    await signIn(page, ACCOUNTS.coordinator);
    await page.getByRole('link', { name: 'Open live' }).click();
    await expect(page).toHaveURL(/\/c\/live\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Roster' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/rotates in/i).first()).toBeVisible();
    await page.getByRole('button', { name: /manual/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Phone battery died at the gate');
    const pad = dialog.getByLabel(/signature pad/i);
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + 80);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 });
    await page.mouse.move(box.x + 220, box.y + 100, { steps: 8 });
    await page.mouse.up();
    await dialog.getByRole('button', { name: /check in/i }).click();
    await expect(page.getByText('Checked in manually')).toBeVisible();
  });

  test('coordinator creates an event with a pinned venue and a shift', async ({ page }) => {
    await signIn(page, ACCOUNTS.coordinator);
    await page.goto('/c/events/new');
    await page.getByLabel('Event name').fill('Merkato clean-up');
    await page.getByRole('button', { name: 'Merkato' }).click();
    await page.getByRole('button', { name: 'Create event' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a shift' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Add shift' }).click();
    await expect(page.getByText('Shift added')).toBeVisible();
  });

  test('platform admin suspends an organization', async ({ page }) => {
    await signIn(page, ACCOUNTS.superadmin);
    await page.goto('/p/organizations/2');
    await page.getByRole('button', { name: /status & plan/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /suspended/i }).click();
    await expect(dialog.getByText(/suspending signs everyone out/i)).toBeVisible();
    await dialog.getByRole('button', { name: /suspend organization/i }).click();
    await expect(page.getByText('Organization suspended')).toBeVisible();
  });

  for (const [email, paths] of [
    [ACCOUNTS.volunteer, ['/v', '/v/opportunities', '/v/schedule', '/v/impact', '/v/certificates', '/v/profile']],
    [ACCOUNTS.coordinator, ['/c', '/c/events', '/c/applications', '/c/hours']],
    [ACCOUNTS.superadmin, ['/p', '/p/organizations', '/p/audit']],
  ] as const) {
    test(`${email} workspace is accessible`, async ({ page }) => {
      test.setTimeout(120_000);
      await signIn(page, email);
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        // Leaflet controls and Recharts SVG internals are third-party markup.
        await expectAccessible(page, { exclude: ['.leaflet-container', '.recharts-wrapper'] });
      }
    });
  }
});
