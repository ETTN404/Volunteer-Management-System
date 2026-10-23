import { motion } from 'motion/react';
import { Crosshair, Loader2, Map as MapIcon, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { searchPlaces, type Place } from '@/shared/lib/geocode';
import { useT } from '@/shared/i18n';
import { Button, Dialog, DialogContent, Input, VenueMap, type MapPoint } from '@/shared/ui';

export interface SharedLocation {
  latitude: number;
  longitude: number;
  source: 'gps' | 'map';
  label?: string;
}

const ADDIS: MapPoint = { latitude: 9.0108, longitude: 38.7613 };

/** Phone GPS with a sensible accuracy wait; resolves once with a fix. */
export function useOneShotLocation(onFix: (l: SharedLocation) => void) {
  const geo = useGeolocation();
  const waiting = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!waiting.current || geo.status !== 'ready' || geo.latitude == null) return;
    // Take a precise fix straight away; otherwise accept the best one after a few seconds.
    if ((geo.accuracy ?? 999) > 200 && timer.current == null) {
      timer.current = window.setTimeout(() => finish(), 6000);
      return;
    }
    if ((geo.accuracy ?? 999) <= 200) finish();
    function finish() {
      if (!waiting.current) return;
      waiting.current = false;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      geo.stop();
      onFix({ latitude: geo.latitude!, longitude: geo.longitude!, source: 'gps' });
    }
  }, [geo.status, geo.latitude, geo.accuracy]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status: geo.status,
    locating: waiting.current && (geo.status === 'locating' || geo.status === 'ready'),
    request: () => {
      waiting.current = true;
      geo.start();
    },
  };
}

/** Shown when VolunBot needs to know where the volunteer is. */
export function LocationRequest({ onShare }: { onShare: (l: SharedLocation) => void }) {
  const t = useT();
  const [mapOpen, setMapOpen] = useState(false);
  const gps = useOneShotLocation(onShare);
  const failed = gps.status === 'denied' || gps.status === 'unavailable' || gps.status === 'timeout';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="relative max-w-md overflow-hidden rounded-[22px] bg-surface p-4 [box-shadow:0_16px_36px_-24px_rgba(17,21,43,0.5),inset_0_0_0_1px_var(--line)]">
      <span className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-[radial-gradient(circle,var(--hue-sky-soft),transparent_70%)]" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,var(--hue-sky),var(--hue-indigo))] text-white shadow-[0_10px_20px_-10px_var(--hue-sky)]">
          <MapPin className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold text-text">{t('Where are you right now?')}</div>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{t('Share your location and I will measure the distance to each venue and rank shifts near you.')}</p>
        </div>
      </div>
      <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={gps.request} loading={gps.locating} className="w-full">
          <Crosshair /> {t('Use my phone location')}
        </Button>
        <Button variant="secondary" onClick={() => setMapOpen(true)} className="w-full">
          <MapIcon /> {t('Pick on the map')}
        </Button>
      </div>
      {failed && (
        <p className="relative mt-2.5 text-[12.5px] text-warning-text">
          {gps.status === 'denied' ? t('Location is blocked for this site. Allow it in your browser settings, or pick your spot on the map.') : t("Couldn't get a GPS fix. Pick your spot on the map instead.")}
        </p>
      )}
      <p className="relative mt-3 flex items-center gap-1.5 text-[11.5px] text-faint">
        <ShieldCheck className="size-3.5" /> {t('Only used for this chat and forgotten after 12 hours.')}
      </p>
      <MapPickerDialog open={mapOpen} onOpenChange={setMapOpen} onPick={onShare} />
    </motion.div>
  );
}

export function MapPickerDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (l: SharedLocation) => void }) {
  const t = useT();
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [label, setLabel] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [fitKey, setFitKey] = useState(0);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = window.setTimeout(() => {
      searchPlaces(query, { country: 'ET' })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 600);
    return () => window.clearTimeout(id);
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('Pick where you are')} description={t('Search an area or tap the map.')} size="lg">
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('e.g. Bole, Piassa, Megenagna')} leading={searching ? <Loader2 className="animate-spin" /> : <Search />} aria-label={t('Search a place')} />
          {results.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1.5 max-h-56 overflow-y-auto rounded-[14px] bg-raised p-1 shadow-xl [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex w-full flex-col items-start rounded-[10px] px-3 py-2 text-left hover:bg-surface-2"
                  onClick={() => {
                    setPoint({ latitude: r.latitude, longitude: r.longitude });
                    setLabel(r.name);
                    setResults([]);
                    setQ(r.name);
                    setFitKey((k) => k + 1);
                  }}
                >
                  <span className="text-[13.5px] font-medium text-text">{r.name}</span>
                  <span className="line-clamp-1 text-[12px] text-faint">{r.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <VenueMap
          venue={point ?? ADDIS}
          radius={60}
          showVenue={Boolean(point)}
          fitKey={fitKey}
          onPick={(p) => {
            setPoint(p);
            setLabel(undefined);
          }}
          label={t('Your spot')}
          className="mt-3 h-[min(52vh,380px)] rounded-[16px]"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted">{point ? (label ?? t('Pinned on the map')) : t('Tap the map to drop a pin.')}</span>
          <Button
            disabled={!point}
            onClick={() => {
              if (!point) return;
              onPick({ ...point, source: 'map', label });
              onOpenChange(false);
            }}
          >
            <MapPin /> {t('Use this spot')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
