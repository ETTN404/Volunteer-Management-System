import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip as LTooltip, useMap, useMapEvents } from 'react-leaflet';
import { cn } from '@/shared/lib/cn';
import { useDocumentTheme } from '@/shared/hooks/use-document-theme';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

// OpenStreetMap standard tiles; dark mode is a CSS filter on the tile pane (no API key needed).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';


const venueIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:var(--accent);box-shadow:0 0 0 4px color-mix(in oklab,var(--accent) 30%,transparent),0 2px 8px rgba(0,0,0,.4)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitTo({ venue, radius, you }: { venue: MapPoint; radius: number; you?: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(venue.latitude, venue.longitude).toBounds(radius * 2.6);
    if (you) bounds.extend([you.latitude, you.longitude]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }, [map, venue.latitude, venue.longitude, radius, you?.latitude, you?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToPlace({ onPick }: { onPick: (p: MapPoint) => void }) {
  useMapEvents({ click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

/**
 * Venue with its geofence ring, optionally the volunteer's position, or an editor mode where a click
 * moves the venue pin (event creation).
 */
export function VenueMap({
  venue,
  radius,
  you,
  inside,
  className,
  onPick,
  interactive = true,
  label,
  showVenue = true,
}: {
  venue: MapPoint;
  radius: number;
  you?: MapPoint | null;
  inside?: boolean;
  className?: string;
  onPick?: (p: MapPoint) => void;
  interactive?: boolean;
  label?: string;
  /** Hide the venue pin + ring (e.g. before a pin is placed). */
  showVenue?: boolean;
}) {
  const theme = useDocumentTheme();
  const accent = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb238', [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const youColor = inside ? '#5ee6b5' : '#ff5a4e';

  return (
    <div data-map-theme={theme} className={cn('relative isolate overflow-hidden rounded-lg bg-sunken [&_.leaflet-container]:bg-[var(--map-bg)] [&_.leaflet-control-zoom_a]:!bg-raised [&_.leaflet-control-zoom_a]:!text-text [&_.leaflet-control-zoom]:!border-line [&_.leaflet-control-attribution]:!bg-bg/70 [&_.leaflet-control-attribution]:!text-[9px] [&_.leaflet-control-attribution]:!text-faint [&_.leaflet-control-attribution_a]:!text-muted', className)}>
      <MapContainer
        center={[venue.latitude, venue.longitude]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl
        className="size-full"
      >
        <TileLayer url={TILE_URL} maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {showVenue && (
          <>
            <Circle center={[venue.latitude, venue.longitude]} radius={radius} pathOptions={{ color: accent, weight: 1.6, dashArray: '4 6', fillColor: accent, fillOpacity: 0.1 }} />
            <Marker position={[venue.latitude, venue.longitude]} icon={venueIcon}>
              {label && (
                <LTooltip direction="top" offset={[0, -10]} permanent className="!rounded-md !border-0 !bg-raised !px-2 !py-1 !text-[11px] !font-medium !text-text !shadow-lg">
                  {label}
                </LTooltip>
              )}
            </Marker>
          </>
        )}
        {you && <CircleMarker center={[you.latitude, you.longitude]} radius={8} pathOptions={{ color: '#071a1c', weight: 3, fillColor: youColor, fillOpacity: 1 }} />}
        {onPick && <ClickToPlace onPick={onPick} />}
        <FitTo venue={venue} radius={radius} you={you} />
      </MapContainer>
    </div>
  );
}
