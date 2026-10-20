import { useEffect } from 'react';
import { volunteerApi } from './api';

/** Current position without prompting (only if the volunteer already granted location). */
export async function quietPosition(timeout = 8000): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return null;
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (perm && perm.state !== 'granted') return null;
  } catch {
    // Permissions API missing (older Safari) — fall through; the browser decides.
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, maximumAge: 30_000, timeout }),
  );
}

/**
 * While the app is open during a shift, send a location ping every few minutes.
 * The coordinator sees "left the venue during the shift" when pings land outside,
 * which stops check-in → leave → come back → check-out from passing unnoticed.
 */
export function usePresencePings(shiftId: number | null | undefined, everyMinutes = 5) {
  useEffect(() => {
    if (!shiftId) return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const pos = await quietPosition();
      if (stopped || !pos) return;
      volunteerApi
        .ping({ shift_id: shiftId, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
        .catch(() => undefined);
    };
    void tick();
    const id = window.setInterval(tick, everyMinutes * 60_000);
    const onVisible = () => document.visibilityState === 'visible' && void tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [shiftId, everyMinutes]);
}
