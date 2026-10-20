/**
 * Address search & reverse geocoding with OpenStreetMap Nominatim (free, no key).
 * Usage policy: ≤ 1 request/second, so callers debounce and we cache results.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** OSM class/type, e.g. "amenity/hospital" — helps tell a building from a whole district. */
  kind: string;
  /** Rough size of the place in meters (bounding box diagonal / 2). */
  extent_m: number | null;
}

const BASE = 'https://nominatim.openstreetmap.org';
const cache = new Map<string, Promise<Place[]>>();
let last = 0;

async function throttle() {
  const wait = Math.max(0, last + 1100 - Date.now());
  last = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  boundingbox?: [string, string, string, string];
}

function toPlace(i: NominatimItem): Place {
  let extent: number | null = null;
  if (i.boundingbox) {
    const [s, n, w, e] = i.boundingbox.map(Number) as [number, number, number, number];
    const dLat = (n - s) * 111_320;
    const dLon = (e - w) * 111_320 * Math.cos((((n + s) / 2) * Math.PI) / 180);
    extent = Math.round(Math.sqrt(dLat * dLat + dLon * dLon) / 2);
  }
  const parts = i.display_name.split(',').map((x) => x.trim());
  return {
    id: String(i.place_id),
    name: i.name || parts[0] || i.display_name,
    address: parts.slice(1, 5).join(', '),
    latitude: Number(i.lat),
    longitude: Number(i.lon),
    kind: [i.class, i.type].filter(Boolean).join('/'),
    extent_m: extent,
  };
}

export function searchPlaces(query: string, opts: { country?: string | null } = {}): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return Promise.resolve([]);
  const key = `${q}|${opts.country ?? ''}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        await throttle();
        const url = new URL(`${BASE}/search`);
        url.searchParams.set('q', q);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '6');
        url.searchParams.set('accept-language', 'en');
        if (opts.country) url.searchParams.set('countrycodes', opts.country.toLowerCase());
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Address search is unavailable right now. Place the pin on the map instead.');
        return ((await res.json()) as NominatimItem[]).map(toPlace);
      })().catch((e) => {
        cache.delete(key);
        throw e;
      }),
    );
  }
  return cache.get(key)!;
}

export async function reverseGeocode(p: { latitude: number; longitude: number }): Promise<Place | null> {
  const key = `rev|${p.latitude.toFixed(5)}|${p.longitude.toFixed(5)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        await throttle();
        const url = new URL(`${BASE}/reverse`);
        url.searchParams.set('lat', String(p.latitude));
        url.searchParams.set('lon', String(p.longitude));
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('zoom', '18');
        url.searchParams.set('accept-language', 'en');
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        const item = (await res.json()) as NominatimItem & { error?: string };
        return item.error ? [] : [toPlace(item)];
      })().catch(() => {
        cache.delete(key);
        return [] as Place[];
      }),
    );
  }
  return (await cache.get(key)!)[0] ?? null;
}
