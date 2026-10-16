import { Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { SKILL_CATALOGUE } from '@/shared/lib/skills';
import { Avatar, Card, EmptyState, ErrorState, Input, PageHeader, Select, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useAllVolunteers } from '@/features/people/api';

export default function VolunteersPage() {
  const vols = useAllVolunteers();
  const base = useLocation().pathname.startsWith('/o') ? '/o/members' : '/c/volunteers';
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const [sort, setSort] = useState<'hours' | 'name' | 'impact'>('hours');

  useEffect(() => {
    document.title = 'Volunteers · VolunTrack';
  }, []);

  const list = useMemo(() => {
    let r = vols.data ?? [];
    if (skill !== 'all') r = r.filter((v) => v.skills.includes(skill));
    if (q.trim()) r = r.filter((v) => `${v.user?.full_name} ${v.user?.email}`.toLowerCase().includes(q.trim().toLowerCase()));
    return [...r].sort((a, b) => (sort === 'name' ? (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '') : sort === 'impact' ? b.impact_score - a.impact_score : b.total_hours - a.total_hours));
  }, [vols.data, q, skill, sort]);
  const skills = useMemo(() => [...new Set([...(vols.data ?? []).flatMap((v) => v.skills), ...SKILL_CATALOGUE])].sort(), [vols.data]);

  return (
    <>
      <PageHeader eyebrow="People" title="Volunteers" description={vols.data ? `${vols.data.length} volunteers in your organization.` : undefined} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" leading={<Search />} className="sm:w-72" aria-label="Search volunteers" />
        <div className="sm:w-52">
          <Select aria-label="Filter by skill" value={skill} onValueChange={setSkill} options={[{ value: 'all', label: 'Any skill' }, ...skills.map((s) => ({ value: s, label: humanizeSkill(s) }))]} />
        </div>
        <div className="sm:ml-auto sm:w-44">
          <Select
            aria-label="Sort volunteers"
            value={sort}
            onValueChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: 'hours', label: 'Most hours' },
              { value: 'impact', label: 'Highest impact' },
              { value: 'name', label: 'Name A–Z' },
            ]}
          />
        </div>
      </div>
      {vols.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </div>
      ) : vols.error ? (
        <ErrorState error={vols.error} onRetry={() => vols.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users />} title="No volunteers match" description="Try a different name or skill." />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => (
            <StaggerItem key={v.id}>
              <Card interactive className="p-5">
                <Link to={`${base}/${v.id}`} className="absolute inset-0 z-10 rounded-lg" aria-label={`Open ${v.user?.full_name}`} />
                <div className="flex items-center gap-3">
                  <Avatar name={v.user?.full_name ?? '?'} src={v.user?.profile_photo_url} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text">{v.user?.full_name}</div>
                    <div className="truncate text-[12.5px] text-faint">{v.user?.email}</div>
                  </div>
                  {v.user && !v.user.is_active && <span className="ml-auto text-[11px] text-danger-text">Inactive</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-md bg-surface-2 py-2">
                    <div className="type-data text-[15px] text-text">{formatHours(v.total_hours)}</div>
                    <div className="text-[11px] text-faint">logged</div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-2">
                    <div className="type-data text-[15px] text-text">{v.impact_score.toFixed(1)}</div>
                    <div className="text-[11px] text-faint">impact</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {v.skills.slice(0, 4).map((s) => (
                    <span key={s} className="rounded px-1.5 py-0.5 text-[11px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
                      {humanizeSkill(s)}
                    </span>
                  ))}
                  {v.skills.length > 4 && <span className="text-[11px] text-faint">+{v.skills.length - 4}</span>}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
