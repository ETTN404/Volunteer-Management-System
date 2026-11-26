import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from './http';

export function createQueryClient() {
  // Writes whose outcome is unknown (timeout, dropped connection, 5xx) may have been
  // saved anyway. Re-read everything — now and again a moment later, when the server
  // has surely finished — so the screen shows what really happened instead of a
  // stale "failed" state the user only fixes by refreshing.
  const mutationCache = new MutationCache({
    onError: (error) => {
      if (!isApiError(error) || !error.outcomeUnknown) return;
      void client.invalidateQueries();
      setTimeout(() => void client.invalidateQueries(), 5_000);
    },
  });
  const client: QueryClient = new QueryClient({
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // Client errors are deterministic — retrying only delays the message.
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false },
    },
  });
  return client;
}
