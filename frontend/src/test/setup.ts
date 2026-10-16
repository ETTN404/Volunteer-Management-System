import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Camera + WASM decoder are not available in jsdom.
vi.mock('@yudiel/react-qr-scanner', () => ({ Scanner: () => null }));
import { server } from '@/mocks/node';
import { resetDb } from '@/mocks/db';
import { installHttpBridge } from '@/app/providers/http-bridge';
import { useSessionStore } from '@/features/auth/session-store';

installHttpBridge();

const isDom = typeof window !== 'undefined';

// jsdom gaps used by Radix, motion and charts.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;
if (isDom) {
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
window.scrollTo = () => {};
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
URL.createObjectURL ??= () => 'blob:mock';
URL.revokeObjectURL ??= () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  resetDb();
  if (isDom) localStorage.clear();
  useSessionStore.setState({ token: null, user: null, endedReason: null, suspendedMessage: null });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
