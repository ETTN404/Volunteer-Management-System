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
import { OrgChip } from '@/features/volunteer/components/org-chip';
import { ReportOrgDialog } from '@/features/volunteer/components/report-org-dialog';
import { useT } from '@/shared/i18n';

export default function OpportunityDetailPage() {
  const eventId = Number(useParams().eventId);
  const event = useOpportunity(eventId);
  const profile = useVolunteerProfile();
  const mine = useMyShifts();
  const t = useT();

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
  const blocked = v?.is_minor && !v.parental_consent_verified ? t('Volunteers under 18 need a verified parental consent form.') : null;
  const hasCoords = e.coordinates.latitude != null && e.coordinates.longitude != null;
  const shifts = [...(e.shifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="min-w-0">
      <Link to="/v/opportunities" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {t('Opportunities')}
      </Link>
      <PageHeader
        eyebrow={
          <>
            <EventStatusBadge status={e.status} size="sm" /> <MatchBadge score={bestMatch(e)} />
          </>
        }
        title={<span className="wrap-anywhere">{e.title}</span>}
      >
        {e.organization && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <OrgChip org={e.organization} size="md" />
            <Link to={`/v/organizations/${e.organization.id}`} className="text-[13px] font-medium text-accent-text hover:underline">
              {t('See all their events')}
            </Link>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-faint" />
            {formatDate(e.start_date, 'EEE d MMM')}
            {e.end_date !== e.start_date && ` – ${formatDate(e.end_date, 'EEE d MMM')}`}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-faint" /> <span className="break-words">{e.location}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-4 shrink-0 text-faint" /> {t('Check-in within {n} m', { n: e.geofence_radius })}
          </span>
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {e.description && (
            <Card className="min-w-0 p-5 sm:p-6">
              <h2 className="type-eyebrow mb-3">{t('About this event')}</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-text wrap-anywhere">{e.description}</p>
            </Card>
          )}
          <section aria-labelledby="shifts-title" className="min-w-0">
            <h2 id="shifts-title" className="type-title mb-1 text-lg text-text">
              {t('Shifts')}
            </h2>
            <p className="mb-4 text-sm text-muted">{t('Skills you have are marked in green. A coordinator reviews every application. Full shift? Join the waitlist.')}</p>
            {blocked && (
              <InlineAlert
                tone="warning"
                className="mb-4"
                title={t('You can’t apply yet')}
                action={
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/v/documents">{t('Upload consent')}</Link>
                  </Button>
                }
              >
                {blocked}
              </InlineAlert>
            )}
            <Stagger className="space-y-3">
              {shifts.map((s) => (
                <StaggerItem key={s.id}>
                  <ShiftRow shift={s} assignment={mine.rows.find((r) => r.shift.id === s.id)?.assignment} mySkills={v?.skills ?? []} blockedReason={blocked} />
                </StaggerItem>
              ))}
              {shifts.length === 0 && <Card className="p-6 text-sm text-muted">{t('The coordinator hasn’t added shifts yet.')}</Card>}
            </Stagger>
          </section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          {hasCoords ? (
            <VenueMap
              venue={{ latitude: e.coordinates.latitude!, longitude: e.coordinates.longitude! }}
              radius={e.geofence_radius}
              className="h-72 sm:h-[380px]"
              label={e.location.split(',')[0]}
            />
          ) : (
            <Card className="grid h-60 place-items-center p-6 text-center text-sm text-muted">{t('This event has no map pin yet.')}</Card>
          )}
          <p className="mt-3 text-[12.5px] text-faint">{t('The dashed ring is the check-in area. Your phone must be inside it when you scan the coordinator’s QR code.')}</p>
          {e.organization && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-[13px] text-muted">
              <span>{t('Something wrong with this organization?')}</span>
              <ReportOrgDialog orgId={e.organization.id} orgName={e.organization.name} eventId={e.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
