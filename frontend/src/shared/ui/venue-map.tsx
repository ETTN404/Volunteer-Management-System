import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, LocateFixed } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip as LTooltip, useMap, useMapEvents } from 'react-leaflet';
import { cn } from '@/shared/lib/cn';
import { useDocumentTheme } from '@/shared/hooks/use-document-theme';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

// Street: OpenStreetMap. Satellite: Esri World Imagery (free with attribution) — lets
// coordinators confirm the exact building, gate or field before saving a venue.
const STREET = { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 };
const SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
};

const venueIcon = (draggable: boolean) =>
  L.divIcon({
    className: '',
    html: draggable
      ? `<span style="display:block;position:relative;width:28px;height:38px;transform:translate(0,-6px)"><svg viewBox="0 0 28 38" width="28" height="38"><path d="M14 37s12-12.6 12-23A12 12 0 0 0 2 14c0 10.4 12 23 12 23z" fill="var(--accent)" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="white"/></svg></span>`
      : `<span style="display:block;width:16px;height:16px;border-radius:999px;background:var(--accent);box-shadow:0 0 0 4px color-mix(in oklab,var(--accent) 30%,transparent),0 2px 8px rgba(0,0,0,.4)"></span>`,
    iconSize: draggable ? [28, 38] : [16, 16],
    iconAnchor: draggable ? [14, 37] : [8, 8],
  });

function FitTo({ venue, radius, you, fitKey }: { venue: MapPoint; radius: number; you?: MapPoint | null; fitKey?: string | number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(venue.latitude, venue.longitude).toBounds(Math.max(radius, 40) * 2.6);
    if (you) bounds.extend([you.latitude, you.longitude]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 18 });
  }, [map, fitKey, venue.latitude, venue.longitude, radius, you?.latitude, you?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToPlace({ onPick }: { onPick: (p: MapPoint) => void }) {
  useMapEvents({ click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

function Recenter({ target }: { target: MapPoint | null }) {
  const map = useMap();
  return (
    <button
      type="button"
      aria-label="Center map on the venue"
      onClick={() => target && map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 17), { duration: 0.6 })}
      className="absolute right-2.5 bottom-9 z-[500] grid size-9 place-items-center rounded-md bg-raised text-text shadow-lg ring-1 ring-line hover:bg-surface-2"
    >
      <LocateFixed className="size-4" />
    </button>
  );
}

/**
 * Venue with its geofence ring, optionally the volunteer's position (+ GPS accuracy ring),
 * or an editor mode where a click or a drag moves the venue pin (event creation).
 */
export function VenueMap({
  venue,
  radius,
  you,
  youAccuracy,
  inside,
  className,
  onPick,
  interactive = true,
  label,
  showVenue = true,
  fitKey,
  defaultLayer = 'street',
}: {
  venue: MapPoint;
  radius: number;
  you?: MapPoint | null;
  /** GPS accuracy of `you` in meters (drawn as a faint ring). */
  youAccuracy?: number | null;
  inside?: boolean;
  className?: string;
  onPick?: (p: MapPoint) => void;
  interactive?: boolean;
  label?: string;
  /** Hide the venue pin + ring (e.g. before a pin is placed). */
  showVenue?: boolean;
  /** Change to force the map to re-fit (e.g. after a search result is chosen). */
  fitKey?: string | number;
  defaultLayer?: 'street' | 'satellite';
}) {
  const theme = useDocumentTheme();
  const [layer, setLayer] = useState<'street' | 'satellite'>(defaultLayer);
  const accent = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3341b8', [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const youColor = inside ? '#22b07d' : '#e5484d';
  const tiles = layer === 'satellite' ? SATELLITE : STREET;
  const markerRef = useRef<L.Marker>(null);
  const editable = Boolean(onPick);

  return (
    <div
      data-map-theme={layer === 'satellite' ? 'light' : theme}
      className={cn(
        'relative isolate overflow-hidden rounded-lg bg-sunken [&_.leaflet-container]:bg-[var(--map-bg)] [&_.leaflet-control-zoom_a]:!bg-raised [&_.leaflet-control-zoom_a]:!text-text [&_.leaflet-control-zoom]:!border-line [&_.leaflet-control-attribution]:!bg-bg/70 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!text-faint [&_.leaflet-control-attribution_a]:!text-muted',
        layer === 'satellite' && '[&_.leaflet-tile-pane]:!filter-none',
        className,
      )}
    >
      <MapContainer
        center={[venue.latitude, venue.longitude]}
        zoom={16}
        scrollWheelZoom={editable}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl
        className="size-full"
      >
        <TileLayer key={layer} url={tiles.url} maxZoom={tiles.maxZoom} attribution={tiles.attribution} />
        {showVenue && (
          <>
            <Circle
              center={[venue.latitude, venue.longitude]}
              radius={radius}
              pathOptions={{ color: accent, weight: 1.8, dashArray: '4 6', fillColor: accent, fillOpacity: layer === 'satellite' ? 0.18 : 0.1 }}
            />
            <Marker
              ref={markerRef}
              position={[venue.latitude, venue.longitude]}
              icon={venueIcon(editable)}
              draggable={editable}
              eventHandlers={
                editable
                  ? {
                      dragend: () => {
                        const p = markerRef.current?.getLatLng();
                        if (p) onPick!({ latitude: p.lat, longitude: p.lng });
                      },
                    }
                  : undefined
              }
            >
              {label && (
                <LTooltip direction="top" offset={[0, editable ? -36 : -10]} permanent className="!rounded-md !border-0 !bg-raised !px-2 !py-1 !text-[11px] !font-medium !text-text !shadow-lg">
                  {label}
                </LTooltip>
              )}
            </Marker>
          </>
        )}
        {you && youAccuracy != null && youAccuracy > 0 && (
          <Circle center={[you.latitude, you.longitude]} radius={youAccuracy} pathOptions={{ color: youColor, weight: 1, fillColor: youColor, fillOpacity: 0.08 }} />
        )}
        {you && <CircleMarker center={[you.latitude, you.longitude]} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: youColor, fillOpacity: 1 }} />}
        {onPick && <ClickToPlace onPick={onPick} />}
        <FitTo venue={venue} radius={radius} you={you} fitKey={fitKey} />
        {interactive && showVenue && <Recenter target={venue} />}
      </MapContainer>
      {interactive && (
        <button
          type="button"
          onClick={() => setLayer((l) => (l === 'street' ? 'satellite' : 'street'))}
          className="absolute top-2.5 right-2.5 z-[500] inline-flex h-8 items-center gap-1.5 rounded-md bg-raised px-2.5 text-xs font-medium text-text shadow-lg ring-1 ring-line hover:bg-surface-2"
        >
          <Layers className="size-3.5" />
          {layer === 'street' ? 'Satellite' : 'Map'}
        </button>
      )}
    </div>
  );
}
