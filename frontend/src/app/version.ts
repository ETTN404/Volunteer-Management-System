/**
 * Stale-deploy guard. A tab opened before a new deploy keeps the old code;
 * when it later lazy-loads a page, the old and new chunks don't match and the
 * page can crash ("x is not a function"). Each build has an id (dist/version.json):
 * once a newer build is seen, the next navigation does a full page load instead.
 */
type RouterLike = { subscribe: (fn: (state: { location: { pathname: string; search: string; hash: string } }) => void) => unknown };

declare const __BUILD_ID__: string;
export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

let newer = false;

export async function hasNewerBuild(): Promise<boolean> {
  if (newer) return true;
  if (BUILD_ID === 'dev') return false;
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return false;
    const { id } = (await r.json()) as { id?: string };
    newer = Boolean(id && id !== BUILD_ID);
  } catch {
    /* offline: keep going */
  }
  return newer;
}

/** Reload at most once per build id, so a real bug can't cause a reload loop. */
export function reloadOnce(): boolean {
  const key = `vt-reloaded-${BUILD_ID}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    /* storage blocked: still reload once */
  }
  window.location.reload();
  return true;
}

export function startVersionWatch(router: RouterLike) {
  if (BUILD_ID === 'dev') return;
  const check = () => void hasNewerBuild();
  window.setInterval(check, 5 * 60_000);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());

  // New build seen → switch to it on the next navigation (full load of the target URL).
  let current = window.location.pathname + window.location.search;
  router.subscribe((state) => {
    const next = state.location.pathname + state.location.search;
    if (next !== current && newer) window.location.assign(next + state.location.hash);
    current = next;
  });

  // A lazy chunk failed to load (old file gone) → reload into the new build.
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    reloadOnce();
  });
}
