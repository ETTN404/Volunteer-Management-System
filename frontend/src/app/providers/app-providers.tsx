import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { createQueryClient } from '@/shared/api/query-client';
import { Toaster, TooltipProvider } from '@/shared/ui';
import { env } from '@/shared/config/env';
import { ThemeSync, useResolvedTheme } from './theme';

const Devtools = env.isDev
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : () => null;

function ThemedToaster() {
  return <Toaster theme={useResolvedTheme()} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={250}>
        <ThemeSync />
        {children}
        <ThemedToaster />
      </TooltipProvider>
      {env.isDev && (
        <Suspense>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
