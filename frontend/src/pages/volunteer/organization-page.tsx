import { ArrowLeft, BadgeCheck, Building2, CalendarCheck2, Clock, Globe, Mail, MapPin, Phone, SearchX, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate } from '@/shared/lib/time';
import { formatNumber } from '@/shared/lib/format';
import { Button, Card, EmptyState, ErrorState, Segmented, Skeleton, SkeletonCard, countryName, formatPhone } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOpportunities, useOrganizationProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { OpportunityCard } from '@/features/volunteer/components/opportunity-card';
import { ReportOrgDialog } from '@/features/volunteer/components/report-org-dialog';

/** One organization: who they are, their impact, and every event they posted (active / past). */
export default function OrganizationPage() {
  const orgId = Number(useParams().orgId);
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState(1);
  const org = useOrganizationProfile(orgId);
  const events = useOpportunities({ org_id: orgId, when, page, per_page: 12 });
  const mine = useMyShifts();
  const applied = useMemo(() => new Set(mine.rows.map((r) => r.shift.id)), [mine.rows]);

  useEffect(() => {
    if (org.data) document.title = `${org.data.name} · VolunTrack`;
  }, [org.data]);

  if (org.isLoading) return <Skeleton className="h-56 rounded-xl" />;
  if (org.error || !org.data) return <ErrorState error={org.error} onRetry={() => org.refetch()} />;
  const o = org.data;

  return (
    <div className="min-w-0">
      <Link to="/v/opportunities" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Opportunities
      </Link>

      <Card className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: o.primary_color ?? 'var(--sunrise)' }} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-faint ring-1 ring-line"
            style={o.primary_color && !o.logo_url ? { background: o.primary_color, color: '#fff' } : undefined}
          >
            {o.logo_url ? <img src={o.logo_url} alt="" className="size-full object-cover" /> : <Building2 className="size-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="type-headline text-2xl break-words text-text sm:text-3xl">{o.name}</h1>
              {o.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
                  <BadgeCheck className="size-3.5" /> Verified organization
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {(o.city || o.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-faint" /> {[o.city, countryName(o.country)].filter(Boolean).join(', ')}
                </span>
              )}
              {o.website && (
                <a href={o.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-text">
                  <Globe className="size-4 text-faint" /> {o.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <a href={`mailto:${o.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-text">
                <Mail className="size-4 text-faint" /> <span className="truncate">{o.email}</span>
              </a>
              {o.phone && (
                <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1.5 hover:text-text">
                  <Phone className="size-4 text-faint" /> {formatPhone(o.phone)}
                </a>
              )}
            </div>
            <p className="mt-2 text-xs text-faint">On VolunTrack since {formatDate(o.member_since, 'MMMM yyyy')}</p>
          </div>
          <ReportOrgDialog orgId={o.id} orgName={o.name} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: CalendarCheck2, label: 'Open events', value: o.stats.active_events },
            { icon: Clock, label: 'Past events', value: o.stats.past_events },
            { icon: Users, label: 'Volunteers', value: o.stats.volunteers },
            { icon: BadgeCheck, label: 'Verified hours', value: o.stats.verified_hours },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg bg-surface-2 px-4 py-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Icon className="size-3.5" /> {label}
              </dt>
              <dd className="type-data mt-1 text-xl font-semibold text-text">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-title text-lg text-text">Events by {o.name}</h2>
        <Segmented
          size="sm"
          aria-label="Which events"
          value={when}
          onValueChange={(v) => {
            setWhen(v);
            setPage(1);
          }}
          options={[
            { value: 'upcoming', label: `Active (${o.stats.active_events})` },
            { value: 'past', label: `Past (${o.stats.past_events})` },
          ]}
        />
      </div>

      {events.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} className="h-60" />
          ))}
        </div>
      ) : events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : (events.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={when === 'upcoming' ? 'No open events right now' : 'No past events yet'}
          description={when === 'upcoming' ? 'Check back soon — you’ll also get an alert when they need people with your skills.' : undefined}
        />
      ) : (
        <Stagger key={`${when}-${page}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.data!.items.map((e) => (
            <StaggerItem key={e.id}>
              <OpportunityCard event={e} appliedShiftIds={applied} showOrg={false} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {events.data && events.data.pagination.last_page > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= events.data.pagination.last_page} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
