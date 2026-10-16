import { expect, expectAccessible, test } from './fixtures';

test.describe('public pages', () => {
  test('landing page tells the story and routes to sign-up', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every shift filled.');
    await expect(page.getByRole('heading', { name: /every moving part/i })).toBeVisible();
    await page.getByRole('link', { name: 'Join as a volunteer' }).first().click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: /create your volunteer account/i })).toBeVisible();
  });

  test('geofence demo reacts to failing gates', async ({ page }) => {
    await page.goto('/#check-in');
    const log = page.locator('#check-in [aria-live=polite]');
    await expect(log).toContainText('201');
    await page.getByLabel('Phone clock is 5 min off').check();
    await expect(log).toContainText('time-drift');
  });

  test('verifies a certificate publicly', async ({ page }) => {
    await page.goto('/verify/VMS-00002');
    await expect(page.getByText('Valid certificate')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Red C.' })).toBeVisible();
    await page.getByLabel('Certificate number').fill('VMS-99999');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByRole('heading', { name: /no certificate matches/i })).toBeVisible();
  });

  test('landing, sign-in and verify pages are accessible', async ({ page }) => {
    for (const path of ['/', '/login', '/register', '/verify/VMS-00001']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectAccessible(page);
    }
  });

  test('landing works on a phone @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'Verify a certificate' }).last()).toBeVisible();
  });
});
