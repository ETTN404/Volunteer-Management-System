import { Radar } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { formatDay, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { Badge, Button, Card, CapacityMeter, EmptyState, ErrorState, PageHeader, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useAllOrgEvents } from '@/features/operations/api';

export default function LiveIndexPage() {
  const events = useAllOrgEvents();
  useEffect(() => {
    document.title = 'Live shifts · VolunTrack';
  }, []);
  const now = new Date();
  const shifts = useMemo(
    () =>
      (events.data ?? [])
        .flatMap((e) => (e.shifts ?? []).map((s) => ({ s, e, start: parseApiDate(s.start_time)!, end: parseApiDate(s.end_time)! })))
        .filter((x) => x.end > new Date(Date.now() - 3_600_000) && x.start < new Date(Date.now() + 2 * 86_400_000))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events.data],
  );

  return (
    <>
      <PageHeader eyebrow="Live shifts" title="Run a shift" description="Open a shift to show the rotating check-in QR, watch the roster fill, and check people in manually when GPS fails." />
      {events.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </div>
      ) : events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : shifts.length === 0 ? (
        <EmptyState icon={<Radar />} title="No shifts in the next 48 hours" description="Shifts starting soon, or running now, appear here." />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {shifts.map(({ s, e, start, end }) => {
            const live = start <= now && end > now;
            return (
              <StaggerItem key={s.id}>
                <Card interactive tone={live ? 'accent' : 'default'} className="p-5">
                  <Link to={`/c/live/${s.id}`} className="absolute inset-0 z-10 rounded-lg" aria-label={`Open ${e.title}`} />
                  <div className="flex items-center justify-between">
                    {live ? (
                      <Badge tone="success" dot pulse>
                        Live now
                      </Badge>
                    ) : (
                      <Badge tone="info">Starts {formatDay(start).toLowerCase()}</Badge>
                    )}
                    <span className="type-data text-[12px] text-faint">{formatTimeRange(s.start_time, s.end_time)}</span>
                  </div>
                  <h3 className="type-title mt-4 text-lg text-text">{e.title}</h3>
                  <p className="mt-1 truncate text-[13px] text-muted">{e.location}</p>
                  <CapacityMeter confirmed={s.confirmed_count} capacity={s.capacity} className="mt-5" />
                  <Button size="sm" className="relative z-20 mt-5" asChild variant={live ? 'primary' : 'secondary'}>
                    <Link to={`/c/live/${s.id}`}>
                      <Radar /> Open live view
                    </Link>
                  </Button>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
