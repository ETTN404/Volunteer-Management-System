import { motion } from 'motion/react';
import { ArrowRight, Award, CalendarCheck2, CalendarDays, Gauge, Megaphone, QrCode, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { greeting, formatRelative, formatDay } from '@/shared/lib/time';
import { firstName, formatHours } from '@/shared/lib/format';
import { nextMilestone, previousMilestone } from '@/shared/lib/skills';
import { Button, Card, CardHeader, ErrorState, HeroBand, IconTile, InlineAlert, Skeleton, SkeletonCard, StatTile, heroPill } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useSession } from '@/features/auth/use-session';
import { useImpact, useOpportunities, useVolunteerProfile } from '@/features/volunteer/api';
import { shiftPhase, useMyShifts } from '@/features/volunteer/derived';
import { NextShiftCard } from '@/features/volunteer/components/next-shift-card';
import { OpportunityCard, bestMatch } from '@/features/volunteer/components/opportunity-card';
import { useAnnouncements } from '@/features/announcements/api';
import { useNow } from '@/shared/hooks/use-now';
import { useLocale, useT } from '@/shared/i18n';

/** Progress to the next certificate — a track with a marker, like a term timeline. */
function MilestoneTrack({ hours }: { hours: number }) {
  const t = useT();
  const next = nextMilestone(hours);
  const prev = previousMilestone(hours);
  const pct = next ? Math.min(100, Math.max(0, ((hours - prev) / (next - prev)) * 100)) : 100;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconTile hue="amber">
            <Award />
          </IconTile>
          <div>
            <div className="text-[15px] font-semibold text-text">{next ? t('Next certificate: {n} hours', { n: next }) : t('Every milestone reached')}</div>
            <div className="text-[12.5px] text-muted">{t('Hours count once a coordinator verifies them')}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="whitespace-nowrap text-[30px] font-extrabold leading-none tracking-[-0.03em] text-text tabular-nums [font-family:var(--font-display)]">{next ? formatHours(next - hours) : '✓'}</div>
          <div className="mt-1 text-[12px] text-muted">{next ? t('to go') : t('Remarkable.')}</div>
        </div>
      </div>
      <div className="relative mt-6 h-2 rounded-full bg-surface-2 [box-shadow:inset_0_0_0_1px_var(--line)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_55%,white),var(--accent))]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className="absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface [box-shadow:0_2px_8px_rgba(17,21,43,0.25),inset_0_0_0_3px_var(--accent)]"
          initial={{ left: 0 }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
        <span>{prev} h</span>
        <span className="font-semibold text-text">{t('{n}% there', { n: Math.round(pct) })}</span>
        <span>{next ?? prev} h</span>
      </div>
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
  const now = useNow(30_000);
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    document.title = `${t('Home')} · VolunTrack`;
  }, [t]);

  const hours = impact.data?.total_hours ?? profile.data?.volunteer.total_hours ?? 0;
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
  const focus = shifts.active ?? shifts.nextConfirmed;
  const canCheckIn = focus ? shiftPhase(focus, now) === 'check-in-open' : false;
  const r = profile.data?.reliability;

  return (
    <div className="min-w-0 space-y-5">
      <HeroBand>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.2)]">
              <CalendarDays className="size-3.5" />
              {new Date().toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="mt-4 text-[clamp(1.9rem,4.4vw,2.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em] [font-family:var(--font-display)]">
              {t(greeting())}, {firstName(user?.full_name)}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] opacity-85">
              {shifts.nextConfirmed
                ? t('Your next shift is {when} at {place}.', { when: t(formatDay(shifts.nextConfirmed.start)).toLowerCase(), place: shifts.nextConfirmed.event.location.split(',')[0] ?? '' })
                : t('Here’s your volunteering at a glance.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCheckIn && focus && (
              <Link to={`/v/check-in/${focus.shift.id}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#11152b] shadow-lg transition-transform hover:-translate-y-0.5">
                <QrCode className="size-4" /> {t('Check in now')}
              </Link>
            )}
            <Link to="/v/opportunities" className={heroPill}>
              <Sparkles /> {t('Find shifts')}
            </Link>
            <Link to="/v/schedule" className={heroPill}>
              <CalendarCheck2 /> {t('My schedule')}
            </Link>
            <Link to="/v/impact" className={heroPill}>
              <Gauge /> {t('See your impact')}
            </Link>
          </div>
        </div>
      </HeroBand>

      {needsConsent && (
        <InlineAlert tone="warning" title={t('Parental consent needed before you can join shifts')} action={<Button asChild size="sm" variant="secondary"><Link to="/v/documents">{t('Upload form')}</Link></Button>}>
          {t('Volunteers under 18 need a signed consent form verified by a coordinator.')}
        </InlineAlert>
      )}

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StaggerItem>
          <StatTile to="/v/impact" hue="indigo" icon={<Timer />} label={t('Verified hours')} value={impact.data ? hours : undefined} decimals={hours % 1 ? 1 : 0} suffix="h" hint={impact.data?.pending_hours ? t('+{h} waiting for review', { h: formatHours(impact.data.pending_hours) }) : t('Counted after verification')} />
        </StaggerItem>
        <StaggerItem>
          <StatTile to="/v/impact" hue="rose" icon={<Gauge />} label={t('Impact score')} value={impact.data?.impact_score} decimals={1} suffix="/100" hint={t('Grows with every verified hour')} />
        </StaggerItem>
        <StaggerItem>
          <StatTile hue="emerald" icon={<ShieldCheck />} label={t('Attendance')} value={r?.attendance_rate} suffix="%" hint={r ? t('{n}% on time', { n: r.on_time_rate }) : undefined} />
        </StaggerItem>
        <StaggerItem>
          <StatTile to="/v/certificates" hue="amber" icon={<CalendarCheck2 />} label={t('Shifts completed')} value={impact.data?.completed_shifts_count} hint={impact.data ? t('{n} certificates earned', { n: impact.data.earned_certificates }) : undefined} />
        </StaggerItem>
      </Stagger>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {shifts.isLoading ? <SkeletonCard className="h-64" /> : shifts.error ? <ErrorState error={shifts.error} onRetry={shifts.refetch} /> : <NextShiftCard next={focus} />}
        <div className="space-y-5">
          {impact.isLoading ? <SkeletonCard className="h-44" /> : <MilestoneTrack hours={hours} />}
          <Card>
            <CardHeader
              title={t('Announcements')}
              eyebrow={<span className="inline-flex items-center gap-1.5 normal-case tracking-normal"><Megaphone className="size-3.5" /> {t('From your organizations')}</span>}
              action={
                <Link to="/v/announcements" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
                  {t('See all')} <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            <div className="divide-y divide-line px-5 pb-3 pt-2">
              {announcements.isLoading && <Skeleton className="my-3 h-14" />}
              {announcements.data?.items.slice(0, 3).map((a) => (
                <article key={a.id} className="min-w-0 py-3">
                  <h3 className="flex items-center gap-2 text-[14px] font-medium text-text">
                    {!a.is_read && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label={t('Unread')} />}
                    <span className="min-w-0 truncate">{a.title}</span>
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-muted wrap-anywhere">{a.message}</p>
                  <p className="mt-1 text-[11.5px] text-faint">
                    {a.organization?.name ? `${a.organization.name} · ` : ''}
                    {formatRelative(a.created_at)}
                  </p>
                </article>
              ))}
              {announcements.data?.items.length === 0 && <p className="py-5 text-center text-sm text-faint">{t('No announcements yet.')}</p>}
            </div>
          </Card>
        </div>
      </div>

      <section aria-labelledby="matched-title" className="min-w-0 pt-3">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="matched-title" className="text-[20px] font-bold tracking-[-0.02em] text-text [font-family:var(--font-display)]">
              {t('Matched to your skills')}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{t('Shifts you haven’t applied for, best fit first.')}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/v/opportunities">
              {t('All opportunities')} <ArrowRight />
            </Link>
          </Button>
        </div>
        {events.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} className="h-60" />
            ))}
          </div>
        ) : matched.length ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matched.map((e) => (
              <OpportunityCard key={e.id} event={e} appliedShiftIds={appliedShiftIds} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-muted">{t('You’ve applied to everything open right now. New shifts appear here as coordinators post them.')}</Card>
        )}
      </section>
    </div>
  );
}
