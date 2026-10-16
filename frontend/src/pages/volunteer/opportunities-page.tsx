import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, EmptyState, ErrorState, Input, PageHeader, Segmented, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOpportunities, useVolunteerProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { OpportunityCard, bestMatch } from '@/features/volunteer/components/opportunity-card';

type Sort = 'match' | 'soonest' | 'open';
type Scope = 'open' | 'all';

export default function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) ?? 'match');
  const [scope, setScope] = useState<Scope>('open');
  const [mineOnly, setMineOnly] = useState(false);
  const events = useOpportunities(page);
  const profile = useVolunteerProfile();
  const shifts = useMyShifts();

  useEffect(() => {
    document.title = 'Opportunities · VolunTrack';
  }, []);

  const applied = useMemo(() => new Set(shifts.rows.map((r) => r.shift.id)), [shifts.rows]);
  const mySkills = profile.data?.volunteer.skills ?? [];

  const list = useMemo(() => {
    let items = events.data?.items ?? [];
    if (scope === 'open') items = items.filter((e) => e.status === 'upcoming' || e.status === 'ongoing');
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter((e) => [e.title, e.location, e.description ?? '', ...(e.shifts ?? []).flatMap((s) => s.required_skills)].join(' ').toLowerCase().includes(needle));
    }
    if (mineOnly) items = items.filter((e) => bestMatch(e) >= 50);
    const open = (e: (typeof items)[number]) => (e.shifts ?? []).reduce((n, s) => n + Math.max(0, s.capacity - (s.confirmed_count ?? 0)), 0);
    return [...items].sort((a, b) =>
      sort === 'match' ? bestMatch(b) - bestMatch(a) : sort === 'open' ? open(b) - open(a) : a.start_date.localeCompare(b.start_date),
    );
  }, [events.data, q, sort, scope, mineOnly]);

  const pagination = events.data?.pagination;
  const go = (p: number) => setParams((prev) => {
    prev.set('page', String(p));
    return prev;
  });

  return (
    <>
      <PageHeader
        eyebrow="Opportunities"
        title="Find a shift that fits you"
        description={mySkills.length ? 'Ranked by how well each shift matches your skills.' : 'Add skills to your profile and we’ll rank shifts by fit.'}
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by event, place or skill" leading={<Search />} className="lg:w-80" aria-label="Search opportunities" />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Segmented value={scope} onValueChange={setScope} size="sm" aria-label="Which events" options={[{ value: 'open', label: 'Open now' }, { value: 'all', label: 'All' }]} />
          <Segmented
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setParams((prev) => {
                prev.set('sort', v);
                return prev;
              });
            }}
            size="sm"
            aria-label="Sort by"
            options={[
              { value: 'match', label: 'Best match' },
              { value: 'soonest', label: 'Soonest' },
              { value: 'open', label: 'Most spots' },
            ]}
          />
          <Button variant={mineOnly ? 'primary' : 'secondary'} size="sm" onClick={() => setMineOnly((m) => !m)} aria-pressed={mineOnly}>
            <SlidersHorizontal /> 50%+ match
          </Button>
        </div>
      </div>

      {events.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No shifts match these filters"
          description="Clear the search or include completed events to see more."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ('');
                setMineOnly(false);
                setScope('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Stagger key={`${page}-${sort}-${scope}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <StaggerItem key={e.id}>
              <OpportunityCard event={e} appliedShiftIds={applied} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {pagination && pagination.last_page > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft /> Previous
          </Button>
          <span className="type-data text-sm text-muted">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pagination.last_page} onClick={() => go(page + 1)}>
            Next <ChevronRight />
          </Button>
        </nav>
      )}
    </>
  );
}
