import { ArrowLeft, CalendarDays, MapPin, Ruler } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate } from '@/shared/lib/time';
import { Button, Card, ErrorState, EventStatusBadge, InlineAlert, PageHeader, Skeleton, VenueMap } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOpportunity, useVolunteerProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { ShiftRow } from '@/features/volunteer/components/shift-row';
import { MatchBadge } from '@/features/volunteer/components/match-badge';
import { bestMatch } from '@/features/volunteer/components/opportunity-card';

export default function OpportunityDetailPage() {
  const eventId = Number(useParams().eventId);
  const event = useOpportunity(eventId);
  const profile = useVolunteerProfile();
  const mine = useMyShifts();

  useEffect(() => {
    if (event.data) document.title = `${event.data.title} · VolunTrack`;
  }, [event.data]);

  if (event.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }
  if (event.error || !event.data) return <ErrorState error={event.error} onRetry={() => event.refetch()} />;

  const e = event.data;
  const v = profile.data?.volunteer;
  const blocked = v?.is_minor && !v.parental_consent_verified ? 'Volunteers under 18 need a verified parental consent form.' : null;
  const hasCoords = e.coordinates.latitude != null && e.coordinates.longitude != null;
  const shifts = [...(e.shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <>
      <Link to="/v/opportunities" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Opportunities
      </Link>
      <PageHeader
        eyebrow={
          <>
            <EventStatusBadge status={e.status} size="sm" /> <MatchBadge score={bestMatch(e)} />
          </>
        }
        title={e.title}
      >
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-faint" />
            {formatDate(e.start_date, 'EEE d MMM')}
            {e.end_date !== e.start_date && ` – ${formatDate(e.end_date, 'EEE d MMM')}`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-faint" /> {e.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-4 text-faint" /> Check-in within {e.geofence_radius} m
          </span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {e.description && (
            <Card className="p-6">
              <h2 className="type-eyebrow mb-3">About this event</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-text">{e.description}</p>
            </Card>
          )}
          <section aria-labelledby="shifts-title">
            <h2 id="shifts-title" className="type-title mb-1 text-lg text-text">
              Shifts
            </h2>
            <p className="mb-4 text-sm text-muted">Skills you have are marked in green. A coordinator reviews every application.</p>
            {blocked && (
              <InlineAlert tone="warning" className="mb-4" title="You can’t apply yet" action={<Button asChild size="sm" variant="secondary"><Link to="/v/documents">Upload consent</Link></Button>}>
                {blocked}
              </InlineAlert>
            )}
            <Stagger className="space-y-3">
              {shifts.map((s) => (
                <StaggerItem key={s.id}>
                  <ShiftRow shift={s} assignment={mine.rows.find((r) => r.shift.id === s.id)?.assignment} mySkills={v?.skills ?? []} blockedReason={blocked} />
                </StaggerItem>
              ))}
              {shifts.length === 0 && <Card className="p-6 text-sm text-muted">The coordinator hasn’t added shifts yet.</Card>}
            </Stagger>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {hasCoords ? (
            <VenueMap venue={{ latitude: e.coordinates.latitude!, longitude: e.coordinates.longitude! }} radius={e.geofence_radius} className="h-[380px]" label={e.location.split(',')[0]} />
          ) : (
            <Card className="grid h-60 place-items-center p-6 text-center text-sm text-muted">This event has no map pin yet — check-in won’t need GPS.</Card>
          )}
          <p className="mt-3 text-[12.5px] text-faint">The dashed ring is the check-in geofence. Your phone must be inside it when you scan the QR code.</p>
        </div>
      </div>
    </>
  );
}
