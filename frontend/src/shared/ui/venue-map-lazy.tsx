import { lazy, Suspense, type ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

const Impl = lazy(() => import('./venue-map').then((m) => ({ default: m.VenueMap })));

/** Leaflet (+ its CSS) only loads on screens that actually show a map. */
export function VenueMap(props: ComponentProps<typeof Impl>) {
  return (
    <Suspense fallback={<div className={cn('skeleton rounded-lg', props.className)} />}>
      <Impl {...props} />
    </Suspense>
  );
}
export type { MapPoint } from './venue-map';
