import { Clock, Sparkles, Target, Timer } from 'lucide-react';
import { useEffect } from 'react';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { formatDate } from '@/shared/lib/time';
import { nextMilestone } from '@/shared/lib/skills';
import { Card, CardBody, CardHeader, ErrorState, PageHeader, ProgressBar, ProgressRing, Skeleton } from '@/shared/ui';
import { AreaTrend, ChartCard, SkillRadar } from '@/shared/ui/charts';
import { CountUp } from '@/shared/motion';
import { useImpact, useImpactHistory, useVolunteerProfile } from '@/features/volunteer/api';
import { MilestoneTrack } from '@/features/volunteer/components/milestone-track';

const BONUSES = [
  { icon: Clock, label: 'Base rate', value: '0.1 per verified hour' },
  { icon: Target, label: 'Skilled shift', value: '+20% when a shift needs 3+ skills' },
  { icon: Timer, label: 'On time', value: '+15% when you check in by the start time' },
  { icon: Sparkles, label: 'Reliable', value: '+10% while attendance stays ≥ 90%' },
];

export default function ImpactPage() {
  const impact = useImpact();
  const history = useImpactHistory();
  const profile = useVolunteerProfile();
  useEffect(() => {
    document.title = 'Impact · VolunTrack';
  }, []);

  if (impact.error) return <ErrorState error={impact.error} onRetry={() => impact.refetch()} />;
  const d = impact.data;
  const r = profile.data?.reliability;
  const radar = Object.entries(profile.data?.skills_alignment ?? {}).map(([axis, value]) => ({ axis: humanizeSkill(axis), value }));
  const next = d ? nextMilestone(d.total_hours) : null;

  return (
    <>
      <PageHeader eyebrow="Impact" title="What your time has added up to" description="Hours count once you check out. Your coordinator verifies them before they reach donor reports." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center p-6 text-center lg:row-span-2">
          <p className="type-eyebrow mb-5">Impact score</p>
          <ProgressRing value={d?.impact_score ?? 0} max={100} size={200} thickness={10} ticks={40} label="Impact score">
            <div>
              <div className="type-display text-5xl leading-none text-text">{d ? <CountUp value={d.impact_score} decimals={1} /> : '—'}</div>
              <div className="mt-1.5 text-xs text-faint">out of 100</div>
            </div>
          </ProgressRing>
          <ul className="mt-7 w-full space-y-2.5 text-left">
            {BONUSES.map((b) => (
              <li key={b.label} className="flex items-start gap-3 rounded-lg bg-surface-2 px-3.5 py-2.5">
                <b.icon className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <div className="text-[13px]">
                  <div className="font-medium text-text">{b.label}</div>
                  <div className="text-muted">{b.value}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Milestones" description={next && d ? `${formatHours(next - d.total_hours)} to your ${next}-hour certificate` : 'Every certificate earned'} />
          <CardBody className="pt-6">{d ? <MilestoneTrack hours={d.total_hours} /> : <Skeleton className="h-10" />}</CardBody>
        </Card>

        <div className="lg:col-span-2">
          <ChartCard title="Hours by month" description="Last 12 months">
            {history.data ? (
              <AreaTrend data={history.data} x="month" y="hours" unit=" h" height={250} xFormat={(m) => formatDate(`${m}-01`, 'MMM')} />
            ) : history.error ? (
              <p className="py-16 text-center text-sm text-muted">Monthly history isn’t available yet.</p>
            ) : (
              <Skeleton className="h-60" />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-5 lg:col-span-2 lg:grid-cols-2">
          <Card className="p-5">
            <div className="type-eyebrow-sm">Attendance rate</div>
            <div className="type-data mt-2 text-3xl text-text">{r ? <CountUp value={r.attendance_rate} decimals={0} /> : '—'}%</div>
            <ProgressBar value={r?.attendance_rate ?? 0} tone="success" className="mt-4" label="Attendance rate" />
            <p className="mt-2.5 text-[12.5px] text-faint">{r ? `${r.total_attended_shifts ?? 0} of ${r.total_confirmed_shifts} confirmed shifts attended` : ''}</p>
          </Card>
          <Card className="p-5">
            <div className="type-eyebrow-sm">On-time rate</div>
            <div className="type-data mt-2 text-3xl text-text">{r ? <CountUp value={r.on_time_rate} decimals={0} /> : '—'}%</div>
            <ProgressBar value={r?.on_time_rate ?? 0} tone="accent" className="mt-4" label="On-time rate" />
            <p className="mt-2.5 text-[12.5px] text-faint">Checked in by the shift start time</p>
          </Card>
        </div>
        <ChartCard title="Skill profile" description="Strength by area, from your skills">
          {radar.length ? <SkillRadar data={radar} height={220} /> : <Skeleton className="h-56" />}
        </ChartCard>
      </div>
    </>
  );
}
