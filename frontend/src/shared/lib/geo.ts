/** Mean Earth radius in meters — same constant as the Laravel GeofenceService. */
const EARTH_RADIUS_M = 6_371_000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters (Haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeofenceResult {
  distance: number;
  inside: boolean;
  /** Meters beyond the edge of the geofence (0 when inside). */
  outsideBy: number;
}

export function checkGeofence(position: LatLng, venue: LatLng, radiusMeters: number): GeofenceResult {
  const distance = distanceMeters(position, venue);
  return { distance, inside: distance <= radiusMeters, outsideBy: Math.max(0, distance - radiusMeters) };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

export function formatCoordinate(value: number, axis: 'lat' | 'lng'): string {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(4)}°${hemi}`;
}

/** Move a point by meters north/east — used by demos and the mock backend. */
export function offsetMeters(origin: LatLng, northM: number, eastM: number): LatLng {
  const dLat = northM / EARTH_RADIUS_M;
  const dLng = eastM / (EARTH_RADIUS_M * Math.cos(toRad(origin.latitude)));
  return {
    latitude: origin.latitude + (dLat * 180) / Math.PI,
    longitude: origin.longitude + (dLng * 180) / Math.PI,
  };
}
