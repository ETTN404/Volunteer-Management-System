import { useSyncExternalStore } from 'react';

const read = (): 'dark' | 'light' => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/** The resolved theme currently applied to <html>, for canvas/map code that can't use CSS variables directly. */
export function useDocumentTheme() {
  return useSyncExternalStore(subscribe, read, () => 'dark' as const);
}
