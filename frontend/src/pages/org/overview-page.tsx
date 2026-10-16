import { ArrowRight, CalendarRange, Clock4, UserPlus, Users, UsersRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { formatDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { Button, Card, CardHeader, ErrorState, PageHeader, Skeleton } from '@/shared/ui';
import { AreaTrend, ChartCard, RankedBars } from '@/shared/ui/charts';
import { CountUp, Stagger, StaggerItem } from '@/shared/motion';
import { useOrgAnalytics, useOrganization } from '@/features/organization/api';
import { useReports } from '@/features/people/api';
import { useOrgAudit } from '@/features/organization/api';
import { actionLabel } from '@/features/audit/audit-trail';
import { formatRelative } from '@/shared/lib/time';

function Tile({ icon, label, value, sub, to }: { icon: React.ReactNode; label: string; value?: number; sub?: string; to?: string }) {
  const card = (
    <Card interactive={Boolean(to)} className="h-full p-5">
      <div className="flex items-center gap-2 text-muted [&_svg]:size-4">
        {icon}
        <span className="type-eyebrow-sm">{label}</span>
      </div>
      <div className="type-display mt-4 text-[38px] leading-none text-text">{value == null ? <Skeleton className="h-9 w-16" /> : <CountUp value={value} />}</div>
      {sub && <div className="mt-2 text-[12.5px] text-faint">{sub}</div>}
    </Card>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

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
      <PageHeader
        eyebrow="Organization"
        title={org.data?.name ?? 'Your organization'}
        description={org.data ? `${org.data.subscription_plan ? org.data.subscription_plan[0]!.toUpperCase() + org.data.subscription_plan.slice(1) : 'Free'} plan · on VolunTrack since ${formatDate(org.data.created_at, 'MMMM yyyy')}` : undefined}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/o/settings">Settings & brand</Link>
            </Button>
            <Button asChild>
              <Link to="/o/team">
                <UserPlus /> Add a coordinator
              </Link>
            </Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem>
          <Tile icon={<Users />} label="Volunteers" value={d?.volunteers} sub={d ? `${d.active_volunteers} active` : undefined} to="/o/members" />
        </StaggerItem>
        <StaggerItem>
          <Tile icon={<UsersRound />} label="Coordinators" value={d?.coordinators} to="/o/team" />
        </StaggerItem>
        <StaggerItem>
          <Tile icon={<CalendarRange />} label="Events" value={d?.events} sub={d ? `${d.upcoming_events} upcoming` : undefined} to="/c/events" />
        </StaggerItem>
        <StaggerItem>
          <Tile icon={<Clock4 />} label="Volunteer hours" value={d ? Math.round(d.total_hours) : undefined} sub="all time" />
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
            {audit.data?.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="truncate text-text">{actionLabel(l.action)}</span>
                <span className="shrink-0 text-[12px] text-faint">{formatRelative(l.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
