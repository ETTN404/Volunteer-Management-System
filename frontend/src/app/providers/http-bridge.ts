import { configureHttp } from '@/shared/api/http';
import { getToken, useSessionStore } from '@/features/auth/session-store';

/** Connects the framework-free HTTP client to the session store. Call once at boot. */
export function installHttpBridge() {
  configureHttp({
    getToken,
    onUnauthorized: () => {
      if (useSessionStore.getState().token) useSessionStore.getState().end('expired');
    },
    onSuspended: (message) => useSessionStore.getState().end('suspended', message),
  });
}
