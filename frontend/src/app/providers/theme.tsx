import { useEffect, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { useUiStore, type ThemePref } from '../ui-store';

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const subscribe = (cb: () => void) => {
  media?.addEventListener('change', cb);
  return () => media?.removeEventListener('change', cb);
};
const systemDark = () => media?.matches ?? true;

export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useUiStore((s) => s.theme);
  const dark = useSyncExternalStore(subscribe, systemDark, () => true);
  return pref === 'system' ? (dark ? 'dark' : 'light') : pref;
}

/** Keeps <html data-theme> in sync with the preference. */
export function ThemeSync() {
  const resolved = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', resolved === 'dark' ? '#07110E' : '#F6F8F6');
  }, [resolved]);
  return null;
}

/** Switch theme with a view-transition crossfade where supported. */
export function useSetTheme() {
  const setTheme = useUiStore((s) => s.setTheme);
  return (next: ThemePref) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      doc.startViewTransition(() => flushSync(() => setTheme(next)));
    } else {
      setTheme(next);
    }
  };
}
