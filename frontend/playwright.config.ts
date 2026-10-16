import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;
const live = process.env.E2E_LIVE === '1';

/**
 * E2E runs against the full in-memory backend (mock mode) so journeys are deterministic.
 * Set E2E_LIVE=1 (with VITE_API_URL pointing at Laravel) to run the @live project against the real API.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@live|@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
    ...(live ? [{ name: 'live', use: { ...devices['Desktop Chrome'] }, grep: /@live/ }] : []),
  ],
  webServer: {
    command: `npx vite --mode ${live ? 'live' : 'mock'} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
