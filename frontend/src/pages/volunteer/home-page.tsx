import { ArrowRight, Award, CalendarCheck2, Gauge, Megaphone, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { greeting, formatRelative } from '@/shared/lib/time';
import { firstName, formatHours } from '@/shared/lib/format';
import { nextMilestone, previousMilestone } from '@/shared/lib/skills';
import { Button, Card, CardHeader, ErrorState, InlineAlert, PageHeader, ProgressRing, Skeleton, SkeletonCard } from '@/shared/ui';
import { CountUp, Stagger, StaggerItem } from '@/shared/motion';
import { useSession } from '@/features/auth/use-session';
import { useImpact, useOpportunities, useVolunteerProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { NextShiftCard } from '@/features/volunteer/components/next-shift-card';
import { OpportunityCard, bestMatch } from '@/features/volunteer/components/opportunity-card';
import { useAnnouncements } from '@/features/announcements/api';
import { formatDay } from '@/shared/lib/time';
import { useT, useLocale } from '@/shared/i18n';

function Stat({ icon, label, value, suffix, decimals = 0, hint }: { icon: React.ReactNode; label: string; value: number | undefined; suffix?: string; decimals?: number; hint?: string }) {
  const t = useT();
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-2 text-muted [&_svg]:size-4 [&_svg]:shrink-0">
        {icon}
        <span className="type-eyebrow-sm truncate">{t(label)}</span>
      </div>
      <div className="type-data mt-3 text-[clamp(1.4rem,6vw,1.75rem)] leading-none text-text">
        {value == null ? <Skeleton className="h-7 w-16" /> : <CountUp value={value} decimals={decimals} />}
        {value != null && suffix && <span className="ml-1 text-base text-faint">{suffix}</span>}
      </div>
      {hint && <p className="mt-2 text-[12.5px] text-faint">{hint}</p>}
    </Card>
  );
}

export default function VolunteerHomePage() {
  const { user } = useSession();
  const profile = useVolunteerProfile();
  const impact = useImpact();
  const shifts = useMyShifts();
  const events = useOpportunities({ per_page: 12 });
  const announcements = useAnnouncements();
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    document.title = `${t('Home')} · VolunTrack`;
  }, [t]);

  const hours = impact.data?.total_hours ?? profile.data?.volunteer.total_hours ?? 0;
  const next = nextMilestone(hours);
  const prev = previousMilestone(hours);
  const appliedShiftIds = useMemo(() => new Set(shifts.rows.map((r) => r.shift.id)), [shifts.rows]);
  const matched = useMemo(
    () =>
      (events.data?.items ?? [])
        .filter((e) => e.status !== 'completed' && e.status !== 'cancelled')
        .filter((e) => !(e.shifts ?? []).every((s) => appliedShiftIds.has(s.id)))
        .sort((a, b) => bestMatch(b) - bestMatch(a))
        .slice(0, 3),
    [events.data, appliedShiftIds],
  );
  const v = profile.data?.volunteer;
  const needsConsent = v?.is_minor && !v.parental_consent_verified;

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow={new Date().toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${t(greeting())}, ${firstName(user?.full_name)}`}
        description={
          shifts.nextConfirmed
            ? t('Your next shift is {when} at {place}.', { when: t(formatDay(shifts.nextConfirmed.start)).toLowerCase(), place: shifts.nextConfirmed.event.location.split(',')[0] ?? '' })
            : t('Here’s your volunteering at a glance.')
        }
        actions={
          <Button asChild variant="secondary">
            <Link to="/v/opportunities">
              <Sparkles /> {t('Find shifts')}
            </Link>
          </Button>
        }
      />

      {needsConsent && (
        <InlineAlert tone="warning" className="mb-6" title={t('Parental consent needed before you can join shifts')} action={<Button asChild size="sm" variant="secondary"><Link to="/v/documents">{t('Upload form')}</Link></Button>}>
          {t('Volunteers under 18 need a signed consent form verified by a coordinator.')}
        </InlineAlert>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {shifts.isLoading ? (
          <SkeletonCard className="h-64" />
        ) : shifts.error ? (
          <ErrorState error={shifts.error} onRetry={shifts.refetch} />
        ) : (
          <NextShiftCard next={shifts.active ?? shifts.nextConfirmed} />
        )}

        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <ProgressRing value={hours - prev} max={(next ?? hours) - prev || 1} size={152} thickness={9} ticks={30} label={t('{h} verified hours', { h: hours })}>
            <div>
              <div className="type-display text-[40px] leading-none text-text">
                <CountUp value={hours} decimals={hours % 1 ? 1 : 0} />
              </div>
              <div className="type-eyebrow mt-1.5 !text-[10px]">{t('verified hours')}</div>
            </div>
          </ProgressRing>
          <p className="mt-5 text-sm text-muted">
            {next ? (
              <>
                <span className="font-semibold text-text">{formatHours(next - hours)}</span> {t('to your {n}-hour certificate', { n: next })}
              </>
            ) : (
              t('Every milestone reached. Remarkable.')
            )}
          </p>
          {Boolean(impact.data?.pending_hours) && (
            <p className="mt-1 text-xs text-faint">{t('+{h} waiting for coordinator review', { h: formatHours(impact.data!.pending_hours!) })}</p>
          )}
          <Button asChild variant="link" size="sm" className="mt-2">
            <Link to="/v/impact">{t('See your impact')}</Link>
          </Button>
        </Card>
      </div>

      <Stagger className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StaggerItem>
          <Stat icon={<Gauge />} label="Impact score" value={impact.data?.impact_score} decimals={1} suffix="/100" />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={<ShieldCheck />} label="Attendance" value={profile.data?.reliability.attendance_rate} suffix="%" hint={profile.data ? t('{n}% on time', { n: profile.data.reliability.on_time_rate }) : undefined} />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={<CalendarCheck2 />} label="Shifts completed" value={impact.data?.completed_shifts_count} />
        </StaggerItem>
        <StaggerItem>
          <Stat icon={<Award />} label="Certificates" value={impact.data?.earned_certificates} />
        </StaggerItem>
      </Stagger>

      <div className="mt-10 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="matched-title" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="matched-title" className="type-title text-lg text-text">
                {t('Matched to your skills')}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{t('Shifts you haven’t applied for, best fit first.')}</p>
            </div>
            <Link to="/v/opportunities" className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline">
              {t('All opportunities')} <ArrowRight className="size-4" />
            </Link>
          </div>
          {events.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} className="h-60" />
              ))}
            </div>
          ) : matched.length ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {matched.map((e) => (
                <OpportunityCard key={e.id} event={e} appliedShiftIds={appliedShiftIds} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-sm text-muted">{t('You’ve applied to everything open right now. New shifts appear here as coordinators post them.')}</Card>
          )}
        </section>

        <Card>
          <CardHeader title={t('Announcements')} eyebrow={<span className="inline-flex items-center gap-1.5"><Megaphone className="size-3.5" /> {t('From your organizations')}</span>} />
          <div className="divide-y divide-line px-5 pb-2 pt-3">
            {announcements.isLoading && <Skeleton className="my-3 h-16" />}
            {announcements.data?.items.slice(0, 3).map((a) => (
              <article key={a.id} className="min-w-0 py-3.5">
                <h3 className="flex items-center gap-2 text-[14px] font-medium text-text">
                  {!a.is_read && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label={t('Unread')} />}
                  <span className="min-w-0 wrap-anywhere">{a.title}</span>
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted wrap-anywhere">{a.message}</p>
                <p className="mt-1.5 text-[11.5px] text-faint">
                  {a.organization?.name ? `${a.organization.name} · ` : ''}
                  {formatRelative(a.created_at)}
                </p>
              </article>
            ))}
            {announcements.data?.items.length === 0 && <p className="py-6 text-center text-sm text-faint">{t('No announcements yet.')}</p>}
          </div>
          <div className="px-5 pb-4">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/v/announcements">{t('See all')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
