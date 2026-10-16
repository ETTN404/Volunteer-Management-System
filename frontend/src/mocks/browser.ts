import { setupWorker } from 'msw/browser';
import type { MockMode } from '@/shared/config/env';
import { allHandlers, pendingHandlers } from './handlers';

export async function startMocks(mode: MockMode) {
  if (mode === 'off') return;
  const worker = setupWorker(...(mode === 'all' ? allHandlers : pendingHandlers));
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
  console.info(
    `%c VolunTrack mocks: ${mode === 'all' ? 'full offline backend' : 'pending backend features only'} `,
    'background:#FFB238;color:#1f1400;border-radius:4px;padding:2px 4px',
  );
}
