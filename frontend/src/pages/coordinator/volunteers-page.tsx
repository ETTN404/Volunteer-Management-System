import { Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { formatRelative } from '@/shared/lib/time';
import { SKILL_CATALOGUE } from '@/shared/lib/skills';
import { Avatar, Badge, Card, EmptyState, ErrorState, Input, PageHeader, Segmented, Select, SkeletonCard, formatPhone } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useAllVolunteers } from '@/features/people/api';

type Who = 'all' | 'member' | 'applicant' | 'upcoming' | 'review';

/**
 * Everyone who works with this organization: members registered under it and
 * volunteers who applied to its shifts (they stay listed after being accepted).
 */
export default function VolunteersPage() {
  const vols = useAllVolunteers();
  const base = useLocation().pathname.startsWith('/o') ? '/o/members' : '/c/volunteers';
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const [who, setWho] = useState<Who>('all');
  const [sort, setSort] = useState<'hours' | 'name' | 'recent'>('hours');

  useEffect(() => {
    document.title = 'Volunteers · VolunTrack';
  }, []);

  const all = vols.data ?? [];
  const list = useMemo(() => {
    let r = all;
    if (who === 'member' || who === 'applicant') r = r.filter((v) => v.relationship === who);
    if (who === 'upcoming') r = r.filter((v) => v.org_stats.upcoming_shifts > 0 || v.org_stats.on_shift_now);
    if (who === 'review') r = r.filter((v) => v.org_stats.pending_applications > 0 || v.org_stats.hours_pending > 0);
    if (skill !== 'all') r = r.filter((v) => v.skills.includes(skill));
    if (q.trim()) r = r.filter((v) => `${v.user?.full_name} ${v.user?.email} ${v.user?.phone ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
    return [...r].sort((a, b) =>
      sort === 'name'
        ? (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '')
        : sort === 'recent'
          ? (b.org_stats.last_shift_at ?? '').localeCompare(a.org_stats.last_shift_at ?? '')
          : b.org_stats.hours_here - a.org_stats.hours_here,
    );
  }, [all, q, skill, sort, who]);
  const skills = useMemo(() => [...new Set([...all.flatMap((v) => v.skills), ...SKILL_CATALOGUE])].sort(), [all]);
  const count = (f: (v: (typeof all)[number]) => boolean) => all.filter(f).length;

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="People"
        title="Volunteers"
        description="Members of your organization and everyone who applied to your shifts. Accepted volunteers stay here with their history."
      />
      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={who}
          onValueChange={setWho}
          size="sm"
          aria-label="Which volunteers"
          options={[
            { value: 'all', label: `All · ${all.length}` },
            { value: 'upcoming', label: `On upcoming shifts · ${count((v) => v.org_stats.upcoming_shifts > 0 || v.org_stats.on_shift_now)}` },
            { value: 'review', label: `Needs review · ${count((v) => v.org_stats.pending_applications > 0 || v.org_stats.hours_pending > 0)}` },
            { value: 'member', label: `Members · ${count((v) => v.relationship === 'member')}` },
            { value: 'applicant', label: `From other orgs · ${count((v) => v.relationship === 'applicant')}` },
          ]}
        />
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" leading={<Search />} className="sm:w-72" aria-label="Search volunteers" />
        <div className="sm:w-52">
          <Select aria-label="Filter by skill" value={skill} onValueChange={setSkill} options={[{ value: 'all', label: 'Any skill' }, ...skills.map((s) => ({ value: s, label: humanizeSkill(s) }))]} />
        </div>
        <div className="sm:ml-auto sm:w-44">
          <Select
            aria-label="Sort volunteers"
            value={sort}
            onValueChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: 'hours', label: 'Most hours here' },
              { value: 'recent', label: 'Recently active' },
              { value: 'name', label: 'Name A–Z' },
            ]}
          />
        </div>
      </div>
      {vols.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="h-44" />
          ))}
        </div>
      ) : vols.error ? (
        <ErrorState error={vols.error} onRetry={() => vols.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={all.length === 0 ? 'No volunteers yet' : 'No volunteers match'}
          description={all.length === 0 ? 'Volunteers appear here as soon as they apply to one of your shifts.' : 'Try a different filter.'}
        />
      ) : (
        <Stagger className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => (
            <StaggerItem key={v.id} className="min-w-0">
              <Card interactive className="relative p-5">
                <Link to={`${base}/${v.id}`} className="absolute inset-0 z-10 rounded-lg" aria-label={`Open ${v.user?.full_name}`} />
                <div className="flex items-center gap-3">
                  <Avatar name={v.user?.full_name ?? '?'} src={v.user?.profile_photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-text">{v.user?.full_name}</div>
                    <div className="truncate text-[12.5px] text-faint">{v.user?.phone ? formatPhone(v.user.phone) : v.user?.email}</div>
                  </div>
                  {v.org_stats.on_shift_now ? (
                    <Badge size="sm" tone="success" dot pulse>
                      On shift
                    </Badge>
                  ) : v.user && v.user.is_active === false ? (
                    <Badge size="sm" tone="danger">
                      Inactive
                    </Badge>
                  ) : (
                    <Badge size="sm" tone={v.relationship === 'member' ? 'accent' : 'neutral'}>
                      {v.relationship === 'member' ? 'Member' : 'Applicant'}
                    </Badge>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-surface-2 py-2">
                    <div className="type-data text-[15px] text-text">{formatHours(v.org_stats.hours_here)}</div>
                    <div className="text-[11px] text-faint">verified here</div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-2">
                    <div className="type-data text-[15px] text-text">{v.org_stats.upcoming_shifts}</div>
                    <div className="text-[11px] text-faint">upcoming</div>
                  </div>
                  <div className="rounded-md bg-surface-2 py-2">
                    <div className="type-data text-[15px] text-text">{v.org_stats.shifts_worked}</div>
                    <div className="text-[11px] text-faint">worked</div>
                  </div>
                </div>
                {(v.org_stats.pending_applications > 0 || v.org_stats.hours_pending > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
                    {v.org_stats.pending_applications > 0 && <span className="rounded-md bg-warning-soft px-2 py-0.5 font-medium text-warning-text">{v.org_stats.pending_applications} application(s) to review</span>}
                    {v.org_stats.hours_pending > 0 && <span className="rounded-md bg-info-soft px-2 py-0.5 font-medium text-info-text">{formatHours(v.org_stats.hours_pending)} to verify</span>}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {v.skills.slice(0, 3).map((s) => (
                    <span key={s} className="rounded px-1.5 py-0.5 text-[11px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
                      {humanizeSkill(s)}
                    </span>
                  ))}
                  {v.skills.length > 3 && <span className="text-[11px] text-faint">+{v.skills.length - 3}</span>}
                  {v.org_stats.last_shift_at && <span className="ml-auto text-[11px] text-faint">Last shift {formatRelative(v.org_stats.last_shift_at)}</span>}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
