import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, EmptyState, ErrorState, Input, PageHeader, Segmented, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOpportunities, useVolunteerProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { OpportunityCard, bestMatch } from '@/features/volunteer/components/opportunity-card';
import { useT } from '@/shared/i18n';

type Sort = 'match' | 'soonest' | 'open';
type When = 'upcoming' | 'past';

export default function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) ?? 'match');
  const [when, setWhen] = useState<When>('upcoming');
  const [mineOnly, setMineOnly] = useState(false);
  const events = useOpportunities({ page, q: debounced || undefined, when, per_page: 12 });
  const profile = useVolunteerProfile();
  const shifts = useMyShifts();
  const t = useT();

  useEffect(() => {
    document.title = `${t('Opportunities')} · VolunTrack`;
  }, [t]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const applied = useMemo(() => new Set(shifts.rows.map((r) => r.shift.id)), [shifts.rows]);
  const mySkills = profile.data?.volunteer.skills ?? [];

  const list = useMemo(() => {
    let items = events.data?.items ?? [];
    if (mineOnly) items = items.filter((e) => bestMatch(e) >= 50);
    const open = (e: (typeof items)[number]) => (e.shifts ?? []).reduce((n, s) => n + Math.max(0, s.capacity - (s.confirmed_count ?? 0)), 0);
    return [...items].sort((a, b) =>
      sort === 'match' ? bestMatch(b) - bestMatch(a) : sort === 'open' ? open(b) - open(a) : a.start_date.localeCompare(b.start_date),
    );
  }, [events.data, sort, mineOnly]);

  const pagination = events.data?.pagination;
  const go = (p: number) =>
    setParams((prev) => {
      prev.set('page', String(p));
      return prev;
    });

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow={t('Opportunities')}
        title={t('Find a shift that fits you')}
        description={mySkills.length ? t('Every verified organization on VolunTrack, ranked by how well each shift matches your skills.') : t('Add skills to your profile and we’ll rank shifts by fit.')}
      />

      <div className="mb-6 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (page !== 1) go(1);
          }}
          placeholder={t('Search events, places or descriptions')}
          leading={<Search />}
          className="lg:w-80"
          aria-label={t('Search opportunities')}
        />
        <div className="-mx-1 flex min-w-0 flex-wrap items-center gap-2 px-1 lg:ml-auto">
          <Segmented
            value={when}
            onValueChange={(v) => {
              setWhen(v);
              go(1);
            }}
            size="sm"
            aria-label={t('Which events')}
            options={[
              { value: 'upcoming', label: t('Open') },
              { value: 'past', label: t('Past') },
            ]}
          />
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
            aria-label={t('Sort by')}
            options={[
              { value: 'match', label: t('Best match') },
              { value: 'soonest', label: t('Soonest') },
              { value: 'open', label: t('Most spots') },
            ]}
          />
          <Button variant={mineOnly ? 'primary' : 'secondary'} size="sm" onClick={() => setMineOnly((m) => !m)} aria-pressed={mineOnly}>
            <SlidersHorizontal /> {t('50%+ match')}
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
          title={debounced || mineOnly ? t('No shifts match these filters') : when === 'upcoming' ? t('No open events right now') : t('No past events')}
          description={debounced || mineOnly ? t('Clear the search or the match filter to see more.') : t('New events appear here as soon as organizations publish them.')}
          action={
            debounced || mineOnly ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQ('');
                  setMineOnly(false);
                }}
              >
                {t('Clear filters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stagger key={`${page}-${sort}-${when}-${debounced}`} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <StaggerItem key={e.id} className="min-w-0">
              <OpportunityCard event={e} appliedShiftIds={applied} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {pagination && pagination.last_page > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label={t('Pagination')}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft /> {t('Previous')}
          </Button>
          <span className="type-data text-sm text-muted">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pagination.last_page} onClick={() => go(page + 1)}>
            {t('Next')} <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
