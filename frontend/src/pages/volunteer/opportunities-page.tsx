import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, Card, DistributionBar, EmptyState, ErrorState, FilterChips, Input, PageHeader, Segmented, Select, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOpportunities, useVolunteerProfile } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { OpportunityCard, bestMatch } from '@/features/volunteer/components/opportunity-card';
import type { VmsEvent } from '@/shared/types/api';
import { useT } from '@/shared/i18n';

type Sort = 'match' | 'soonest' | 'open';
type When = 'upcoming' | 'past';
type Filter = 'all' | 'match' | 'new' | 'applied' | 'full';

const openPlaces = (e: VmsEvent) => (e.shifts ?? []).reduce((n, s) => n + Math.max(0, s.capacity - (s.confirmed_count ?? 0)), 0);

export default function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) ?? 'match');
  const [when, setWhen] = useState<When>('upcoming');
  const [filter, setFilter] = useState<Filter>('all');
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
  const items = events.data?.items ?? [];

  const groups = useMemo(() => {
    const isApplied = (e: VmsEvent) => (e.shifts ?? []).some((s) => applied.has(s.id));
    return {
      all: items,
      match: items.filter((e) => bestMatch(e) >= 50),
      new: items.filter((e) => (e.shifts ?? []).some((s) => !applied.has(s.id) && s.capacity > (s.confirmed_count ?? 0))),
      applied: items.filter(isApplied),
      full: items.filter((e) => (e.shifts ?? []).length > 0 && openPlaces(e) === 0),
    } satisfies Record<Filter, VmsEvent[]>;
  }, [items, applied]);

  const list = useMemo(
    () =>
      [...groups[filter]].sort((a, b) =>
        sort === 'match' ? bestMatch(b) - bestMatch(a) : sort === 'open' ? openPlaces(b) - openPlaces(a) : a.start_date.localeCompare(b.start_date),
      ),
    [groups, filter, sort],
  );

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
        actions={
          <Segmented
            value={when}
            onValueChange={(v) => {
              setWhen(v);
              go(1);
            }}
            aria-label={t('Which events')}
            options={[
              { value: 'upcoming', label: t('Open') },
              { value: 'past', label: t('Past') },
            ]}
          />
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="space-y-4 p-4 sm:p-5">
          <DistributionBar
            segments={[
              { value: groups.applied.length, hue: 'indigo', label: t('Applied') },
              { value: groups.new.length, hue: 'emerald', label: t('Open to apply') },
              { value: groups.full.length, hue: 'rose', label: t('Full') },
            ]}
          />
          <FilterChips
            value={filter}
            onChange={setFilter}
            aria-label={t('Filter')}
            options={[
              { value: 'all', label: t('All'), count: groups.all.length },
              { value: 'match', label: t('Good match'), count: groups.match.length, hue: 'violet' },
              { value: 'new', label: t('Open to apply'), count: groups.new.length, hue: 'emerald' },
              { value: 'applied', label: t('Applied'), count: groups.applied.length, hue: 'indigo' },
              { value: 'full', label: t('Full'), count: groups.full.length, hue: 'rose' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center sm:px-5">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (page !== 1) go(1);
            }}
            placeholder={t('Search events, places or descriptions')}
            leading={<Search />}
            className="sm:w-96"
            aria-label={t('Search opportunities')}
          />
          <div className="flex items-center gap-3 sm:ml-auto">
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as Sort);
                setParams((prev) => {
                  prev.set('sort', v);
                  return prev;
                });
              }}
              aria-label={t('Sort by')}
              className="w-44"
              options={[
                { value: 'match', label: t('Best match') },
                { value: 'soonest', label: t('Soonest') },
                { value: 'open', label: t('Most spots') },
              ]}
            />
            <span className="whitespace-nowrap text-[13px] text-muted">{t('{n} shown', { n: list.length })}</span>
          </div>
        </div>
      </Card>

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
          title={debounced || filter !== 'all' ? t('No shifts match these filters') : when === 'upcoming' ? t('No open events right now') : t('No past events')}
          description={debounced || filter !== 'all' ? t('Clear the search or the match filter to see more.') : t('New events appear here as soon as organizations publish them.')}
          action={
            debounced || filter !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQ('');
                  setFilter('all');
                }}
              >
                {t('Clear filters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stagger key={`${page}-${sort}-${when}-${debounced}-${filter}`} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <StaggerItem key={e.id} className="min-w-0">
              <OpportunityCard event={e} appliedShiftIds={applied} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {pagination && pagination.last_page > 1 && (
        <nav className="mt-8 flex flex-wrap items-center justify-end gap-3" aria-label={t('Pagination')}>
          <span className="mr-auto text-[13px] text-muted">{t('Page {a} of {b}', { a: pagination.current_page, b: pagination.last_page })}</span>
          <Button variant="secondary" size="icon" aria-label={t('First page')} disabled={page <= 1} onClick={() => go(1)}>
            <ChevronsLeft />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t('Previous')} disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t('Next')} disabled={page >= pagination.last_page} onClick={() => go(page + 1)}>
            <ChevronRight />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t('Last page')} disabled={page >= pagination.last_page} onClick={() => go(pagination.last_page)}>
            <ChevronsRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
