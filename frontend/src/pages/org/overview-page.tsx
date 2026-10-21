import { ArrowRight, CalendarRange, Clock4, ExternalLink, Gem, Palette, UserPlus, Users, UsersRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { formatDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { Card, CardHeader, ErrorState, HeroBand, Skeleton, StatTile, heroPill } from '@/shared/ui';
import { AreaTrend, ChartCard, RankedBars } from '@/shared/ui/charts';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOrgAnalytics, useOrganization } from '@/features/organization/api';
import { useReports } from '@/features/people/api';
import { useOrgAudit } from '@/features/organization/api';
import { actionLabel } from '@/features/audit/audit-trail';
import { formatRelative } from '@/shared/lib/time';

export default function OrgOverviewPage() {
  const org = useOrganization();
  const a = useOrgAnalytics();
  const reports = useReports();
  const audit = useOrgAudit();

  useEffect(() => {
    document.title = 'Overview · VolunTrack';
  }, []);

  if (a.error) return <ErrorState error={a.error} onRetry={() => a.refetch()} />;
  const d = a.data;

  return (
    <>
      <HeroBand className="mb-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-white text-[20px] font-extrabold text-[#11152b] shadow-xl">
              {org.data?.logo_url ? <img src={org.data.logo_url} alt="" className="size-full object-cover" /> : (org.data?.name ?? 'VT').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.2)]">
                <Gem className="size-3.5" />
                {org.data ? `${org.data.subscription_plan ? org.data.subscription_plan[0]!.toUpperCase() + org.data.subscription_plan.slice(1) : 'Free'} plan` : 'Plan'}
              </span>
              <h1 className="mt-3 truncate text-[clamp(1.8rem,4vw,2.7rem)] font-extrabold leading-[1.05] tracking-[-0.04em] [font-family:var(--font-display)]">{org.data?.name ?? 'Your organization'}</h1>
              <p className="mt-1.5 text-[15px] opacity-85">{org.data ? `On VolunTrack since ${formatDate(org.data.created_at, 'MMMM yyyy')}` : '\u00a0'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/o/team" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#11152b] shadow-lg transition-transform hover:-translate-y-0.5">
              <UserPlus className="size-4" /> Add a coordinator
            </Link>
            <Link to="/o/settings" className={heroPill}>
              <Palette /> Settings & brand
            </Link>
            {org.data && (
              <a href={`/orgs/${org.data.id}`} target="_blank" rel="noreferrer" className={heroPill}>
                <ExternalLink /> Public page
              </a>
            )}
          </div>
        </div>
      </HeroBand>

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StaggerItem>
          <StatTile hue="indigo" icon={<Users />} label="Volunteers" value={d?.volunteers} hint={d ? `${d.active_volunteers} active` : undefined} to="/o/members" />
        </StaggerItem>
        <StaggerItem>
          <StatTile hue="rose" icon={<UsersRound />} label="Coordinators" value={d?.coordinators} hint="running your events" to="/o/team" />
        </StaggerItem>
        <StaggerItem>
          <StatTile hue="amber" icon={<CalendarRange />} label="Events" value={d?.events} hint={d ? `${d.upcoming_events} upcoming` : undefined} to="/c/events" />
        </StaggerItem>
        <StaggerItem>
          <StatTile hue="emerald" icon={<Clock4 />} label="Volunteer hours" value={d ? Math.round(d.total_hours) : undefined} suffix="h" hint="all time" />
        </StaggerItem>
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard title="Hours by month" description="Last six months, all programmes">
          {d ? (
            d.hours_by_month.length ? (
              <AreaTrend data={d.hours_by_month} x="month" y="hours" unit=" h" xFormat={(m) => formatDate(`${m}-01`, 'MMM')} />
            ) : (
              <p className="py-20 text-center text-sm text-muted">Monthly hours will appear once the server reports them.</p>
            )
          ) : (
            <Skeleton className="h-60" />
          )}
        </ChartCard>
        <ChartCard title="Skills in your volunteer base" description="Use this to plan which shifts you can staff">
          {d ? <RankedBars data={d.top_skills.map((s) => ({ label: humanizeSkill(s.skill), value: s.count }))} /> : <Skeleton className="h-60" />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Impact reports"
            action={
              <Link to="/o/reports" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
                All reports <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="mt-2 divide-y divide-line px-5 pb-3">
            {reports.data?.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-text">{r.period}</span>
                <span className="type-data text-muted">
                  {r.total_volunteers} volunteers · {Math.round(r.total_hours)} h
                </span>
              </li>
            ))}
            {reports.data?.length === 0 && <li className="py-6 text-center text-sm text-muted">No reports yet.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Link to="/o/audit" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
                Audit trail <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="mt-2 divide-y divide-line px-5 pb-3">
            {audit.data?.items.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="truncate text-text">{l.action_label ?? actionLabel(l.action)}</span>
                <span className="shrink-0 text-[12px] text-faint">{formatRelative(l.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
