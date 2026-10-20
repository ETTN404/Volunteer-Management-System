/**
 * Venue picker for events. Accuracy matters: volunteers can only check in inside the
 * ring drawn here, so the coordinator searches the real address, confirms on satellite
 * imagery, drags the pin to the exact entrance and sets a sensible radius.
 */
import { AlertTriangle, Crosshair, Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { reverseGeocode, searchPlaces, type Place } from '@/shared/lib/geocode';
import { formatDistance } from '@/shared/lib/geo';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Slider } from './controls';
import { Input } from './input';
import { VenueMap } from './venue-map-lazy';

export interface VenueValue {
  location: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
}

const ADDIS = { latitude: 9.0108, longitude: 38.7613 };

export function LocationPicker({
  value,
  onChange,
  country,
  invalid,
}: {
  value: VenueValue;
  onChange: (v: VenueValue) => void;
  /** ISO country to bias address search. */
  country?: string | null;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [suggested, setSuggested] = useState<Place | null>(null);
  const [wideArea, setWideArea] = useState<number | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const geo = useGeolocation();
  const usingGeo = useRef(false);

  const hasPin = value.latitude != null && value.longitude != null;
  const pin = hasPin ? { latitude: value.latitude!, longitude: value.longitude! } : ADDIS;

  // Debounced address search (Nominatim allows 1 request/second).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(q, { country })
        .then((r) => {
          setResults(r);
          setSearchError(null);
          setOpen(true);
        })
        .catch((e: Error) => setSearchError(e.message))
        .finally(() => setSearching(false));
    }, 650);
    return () => clearTimeout(t);
  }, [query, country]);

  // "Use my location": take the first fix that is precise enough.
  useEffect(() => {
    if (!usingGeo.current || geo.status !== 'ready' || geo.latitude == null) return;
    if ((geo.accuracy ?? 999) > 150) return; // keep waiting for a better fix
    usingGeo.current = false;
    geo.stop();
    movePin({ latitude: geo.latitude, longitude: geo.longitude! }, true);
  }, [geo.status, geo.latitude, geo.accuracy]); // eslint-disable-line react-hooks/exhaustive-deps

  function movePin(p: { latitude: number; longitude: number }, refit = false) {
    onChange({ ...value, latitude: round6(p.latitude), longitude: round6(p.longitude) });
    if (refit) setFitKey((k) => k + 1);
    setSuggested(null);
    reverseGeocode(p).then((place) => setSuggested(place));
  }

  function choose(place: Place) {
    onChange({ ...value, location: [place.name, place.address].filter(Boolean).join(', ').slice(0, 255), latitude: round6(place.latitude), longitude: round6(place.longitude) });
    setWideArea(place.extent_m && place.extent_m > 400 ? place.extent_m : null);
    setQuery('');
    setResults([]);
    setOpen(false);
    setSuggested(null);
    setFitKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results[0]) choose(results[0]);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search the venue address, e.g. Millennium Hall, Bole"
          leading={<Search />}
          trailing={searching ? <Loader2 className="animate-spin" /> : null}
          aria-label="Search venue address"
          aria-invalid={invalid || undefined}
        />
        {open && results.length > 0 && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-[600] mt-1 max-h-72 overflow-y-auto rounded-lg bg-raised p-1 shadow-pop ring-1 ring-line">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(r)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-surface-2"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">{r.name}</span>
                    <span className="block truncate text-xs text-muted">{r.address}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError && <p className="mt-1.5 text-xs text-warning-text">{searchError}</p>}
      </div>

      <div className="relative">
        <VenueMap
          className={cn('h-72 sm:h-80', invalid && !hasPin && 'ring-2 ring-danger')}
          venue={pin}
          radius={value.radius}
          showVenue={hasPin}
          onPick={(p) => movePin(p)}
          label={hasPin ? 'Check-in point' : undefined}
          fitKey={fitKey}
        />
        {!hasPin && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-md bg-raised/95 px-3 py-2 text-xs text-muted shadow-lg ring-1 ring-line">
            Search the address above, or tap the map where volunteers will check in.
          </div>
        )}
      </div>

      {wideArea && (
        <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-text">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          This result covers a wide area (about {formatDistance(wideArea)} across). Switch to Satellite and drag the pin to the exact entrance volunteers will use.
        </div>
      )}

      {suggested && hasPin && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Pin is at:</span>
          <span className="font-medium text-text">{[suggested.name, suggested.address].filter(Boolean).join(', ')}</span>
          {value.location !== [suggested.name, suggested.address].filter(Boolean).join(', ').slice(0, 255) && (
            <button
              type="button"
              className="font-medium text-accent-text hover:underline"
              onClick={() => onChange({ ...value, location: [suggested.name, suggested.address].filter(Boolean).join(', ').slice(0, 255) })}
            >
              Use as venue name
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <CoordInput label="Latitude" value={value.latitude} min={-90} max={90} onChange={(v) => onChange({ ...value, latitude: v })} />
        <CoordInput label="Longitude" value={value.longitude} min={-180} max={180} onChange={(v) => onChange({ ...value, longitude: v })} />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={usingGeo.current && geo.status === 'locating'}
            onClick={() => {
              usingGeo.current = true;
              geo.start();
            }}
          >
            <Crosshair /> I'm at the venue
          </Button>
        </div>
      </div>
      {usingGeo.current && geo.status === 'ready' && (geo.accuracy ?? 0) > 150 && (
        <p className="text-xs text-muted">Waiting for a precise GPS fix (now ±{Math.round(geo.accuracy ?? 0)} m)…</p>
      )}
      {(geo.status === 'denied' || geo.status === 'unavailable') && <p className="text-xs text-warning-text">Location access is off. Allow it in the browser, or search the address.</p>}

      <div className="rounded-lg bg-surface-2 p-3.5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-text">Check-in radius</span>
          <span className="type-data text-accent-text">{value.radius} m</span>
        </div>
        <Slider min={30} max={1000} step={10} value={[value.radius]} onValueChange={([r]) => onChange({ ...value, radius: r ?? value.radius })} aria-label="Check-in radius" />
        <p className="mt-2 text-xs text-muted">
          Volunteers must be inside this ring to check in. Phones are usually accurate to 10–50 m outdoors and worse indoors —{' '}
          {value.radius < 60 ? 'this is tight; people inside a large building may be refused.' : value.radius > 400 ? 'this is wide; someone nearby but not at your venue could check in.' : 'a good balance for most venues.'}
        </p>
      </div>
    </div>
  );
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function CoordInput({ label, value, onChange, min, max }: { label: string; value: number | null; onChange: (v: number | null) => void; min: number; max: number }) {
  const [text, setText] = useState(value?.toString() ?? '');
  useEffect(() => setText(value?.toString() ?? ''), [value]);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-text">{label}</span>
      <Input
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text);
          if (text.trim() === '') onChange(null);
          else if (Number.isFinite(n) && n >= min && n <= max) onChange(round6(n));
          else setText(value?.toString() ?? '');
        }}
        className="type-data"
      />
    </label>
  );
}
