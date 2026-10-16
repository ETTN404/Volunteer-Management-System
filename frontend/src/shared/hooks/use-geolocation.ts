import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'timeout';

export interface GeoState {
  status: GeoStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  updatedAt?: number;
}

/** Watches the device position with high accuracy. Call `start()` from a user gesture. */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable' });
      return;
    }
    stop();
    setState((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'locating' }));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          status: 'ready',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: pos.timestamp,
        }),
      (err) =>
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
        })),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}
