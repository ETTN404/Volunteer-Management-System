import { ArrowRight, Building2, ShieldCheck, UserPlus, Users, UsersRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { Badge, Button, Card, CardHeader, FieldMap, PageHeader, Skeleton } from '@/shared/ui';
import { AreaTrend, Bars, ChartCard } from '@/shared/ui/charts';
import { CountUp, Stagger, StaggerItem } from '@/shared/motion';
import { useAllOrganizations, usePlatformAudit, usePlatformMetrics, usePlatformTimeseries } from '@/features/platform/api';
import { actionLabel } from '@/features/audit/audit-trail';

export default function PlatformPage() {
  const m = usePlatformMetrics();
  const ts = usePlatformTimeseries();
  const orgs = useAllOrganizations();
  const audit = usePlatformAudit();

  useEffect(() => {
    document.title = 'Platform · VolunTrack';
  }, []);

  const tiles = [
    { icon: <Building2 />, label: 'Organizations', value: m.data?.total_organizations, sub: m.data ? `${m.data.active_organizations} active` : '' },
    { icon: <Users />, label: 'Users', value: m.data?.total_users },
    { icon: <UsersRound />, label: 'Volunteers', value: m.data?.total_volunteers },
    { icon: <ShieldCheck />, label: 'Coordinators', value: m.data?.total_coordinators },
  ];

  return (
    <>
      <div className="relative -mx-4 -mt-7 mb-8 overflow-hidden border-b border-line sm:-mx-6 lg:-mx-10 lg:-mt-10">
        <div className="absolute inset-0" aria-hidden>
          <FieldMap
            venues={(orgs.data ?? []).filter((o) => o.status === 'active').slice(0, 5).map((o, i) => ({ id: o.id, x: 0.5 + (i % 3) * 0.17, y: 0.3 + Math.floor(i / 3) * 0.4 + (i % 2) * 0.08, radius: 30 + (5 - i) * 6, label: o.name.length > 18 ? o.name.split(' ')[0] : o.name }))}
            pingEvery={1600}
            intensity="calm"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--bg)_25%,color-mix(in_oklab,var(--bg)_30%,transparent)_70%,transparent)]" />
        </div>
        <div className="relative px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <PageHeader
            className="mb-0 md:mb-0"
            eyebrow="Platform command"
            title="Every organization, one view"
            description="Tenants, people and activity across VolunTrack. Each organization’s data stays isolated from the others."
            actions={
              <Button asChild>
                <Link to="/p/onboard">
                  <UserPlus /> Onboard an organization
                </Link>
              </Button>
            }
          />
        </div>
      </div>

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <StaggerItem key={t.label}>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted [&_svg]:size-4">
                {t.icon}
                <span className="type-eyebrow-sm">{t.label}</span>
              </div>
              <div className="type-display mt-4 text-[38px] leading-none text-text">{t.value == null ? <Skeleton className="h-9 w-16" /> : <CountUp value={t.value} />}</div>
              {t.sub && <div className="mt-2 text-[12.5px] text-faint">{t.sub}</div>}
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Growth" description="Cumulative users, last 12 months">
          {ts.data ? <AreaTrend data={ts.data} x="date" y="users" xFormat={(d) => formatDate(`${d}-01`, 'MMM')} /> : <Skeleton className="h-60" />}
        </ChartCard>
        <ChartCard title="Volunteer hours per month" description="Across all organizations">
          {ts.data ? <Bars data={ts.data} x="date" y="hours" unit=" h" xFormat={(d) => formatDate(`${d}-01`, 'MMM')} height={240} /> : <Skeleton className="h-60" />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Organizations"
            action={
              <Link to="/p/organizations" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
                Manage <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="mt-2 divide-y divide-line px-5 pb-3">
            {orgs.data?.slice(0, 6).map((o) => (
              <li key={o.id}>
                <Link to={`/p/organizations/${o.id}`} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-muted">{o.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text">{o.name}</span>
                    <span className="block text-[12px] text-faint">{o.subscription_plan ?? 'free'} plan</span>
                  </span>
                  <Badge size="sm" dot tone={o.status === 'active' ? 'success' : o.status === 'suspended' ? 'danger' : 'neutral'}>
                    {o.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Latest activity"
            action={
              <Link to="/p/audit" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
                Audit trail <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="mt-2 divide-y divide-line px-5 pb-3">
            {audit.data?.slice(0, 6).map((l) => (
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
