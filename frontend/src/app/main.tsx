import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@/styles/globals.css';
import { env } from '@/shared/config/env';
import { AppProviders } from './providers/app-providers';
import { installHttpBridge } from './providers/http-bridge';
import { router } from './router';
import { startVersionWatch } from './version';

async function boot() {
  installHttpBridge();
  startVersionWatch(router);
  if (env.mockMode !== 'off') {
    const { startMocks } = await import('@/mocks/browser');
    await startMocks(env.mockMode);
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

void boot();
