import {
    CalendarPlus,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List,
    MapPin,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { EventStatus, VmsEvent } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import {
    Button,
    Card,
    CapacityMeter,
    EmptyState,
    ErrorState,
    EventStatusBadge,
    FilterChips,
    Input,
    PageHeader,
    Segmented,
    SkeletonCard,
} from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useOrgEvents } from '@/features/operations/api';

const totals = (e: VmsEvent) => {
    const shifts = e.shifts ?? [];
    return {
        shifts: shifts.length,
        capacity: shifts.reduce((n, s) => n + s.capacity, 0),
        confirmed: shifts.reduce((n, s) => n + (s.confirmed_count ?? 0), 0),
    };
};

export default function EventsPage() {
    const [params, setParams] = useSearchParams();
    const page = Number(params.get('page') ?? 1);
    const events = useOrgEvents(page);
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<EventStatus | 'all'>('all');
    const [view, setView] = useState<'grid' | 'table'>('grid');

    useEffect(() => {
        document.title = 'Events · VolunTrack';
    }, []);

    const list = useMemo(() => {
        let items = events.data?.items ?? [];
        if (status !== 'all') items = items.filter((e) => e.status === status);
        if (q.trim())
            items = items.filter((e) =>
                `${e.title} ${e.location}`.toLowerCase().includes(q.trim().toLowerCase()),
            );
        return items;
    }, [events.data, q, status]);
    const p = events.data?.pagination;

    return (
        <>
            <PageHeader
                title="Events & shifts"
                description="Create events, pin the venue, and add the shifts volunteers apply for."
                actions={
                    <Button asChild>
                        <Link to="/c/events/new">
                            <CalendarPlus /> New event
                        </Link>
                    </Button>
                }
            />
            <Card className="mb-6 overflow-hidden">
                <div className="p-4 sm:p-5">
                    <FilterChips
                        value={status}
                        onChange={setStatus}
                        aria-label="Status"
                        options={[
                            { value: 'all', label: 'All', count: (events.data?.items ?? []).length },
                            {
                                value: 'upcoming',
                                label: 'Upcoming',
                                hue: 'sky',
                                count: (events.data?.items ?? []).filter((e) => e.status === 'upcoming')
                                    .length,
                            },
                            {
                                value: 'ongoing',
                                label: 'Live',
                                hue: 'emerald',
                                count: (events.data?.items ?? []).filter((e) => e.status === 'ongoing')
                                    .length,
                            },
                            {
                                value: 'completed',
                                label: 'Completed',
                                hue: 'violet',
                                count: (events.data?.items ?? []).filter((e) => e.status === 'completed')
                                    .length,
                            },
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-3 border-t border-line bg-surface-2/50 p-4 md:flex-row md:items-center md:px-5">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search events or places"
                        leading={<Search />}
                        className="md:w-80"
                        aria-label="Search events"
                    />
                    <Segmented
                        size="sm"
                        className="md:ml-auto"
                        value={view}
                        onValueChange={setView}
                        aria-label="Layout"
                        options={[
                            { value: 'grid', label: 'Cards', icon: <LayoutGrid /> },
                            { value: 'table', label: 'Table', icon: <List /> },
                        ]}
                    />
                </div>
            </Card>

            {events.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, i) => (
                        <SkeletonCard key={i} className="h-56" />
                    ))}
                </div>
            ) : events.error ? (
                <ErrorState error={events.error} onRetry={() => events.refetch()} />
            ) : list.length === 0 ? (
                <EmptyState
                    icon={<CalendarRange />}
                    title={q || status !== 'all' ? 'No events match' : 'No events yet'}
                    description={
                        q || status !== 'all'
                            ? 'Try another search or status.'
                            : 'Create your first event, then add shifts for volunteers to apply to.'
                    }
                    action={
                        <Button asChild>
                            <Link to="/c/events/new">Create an event</Link>
                        </Button>
                    }
                />
            ) : view === 'grid' ? (
                <Stagger key={`${status}-${page}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((e) => {
                        const t = totals(e);
                        return (
                            <StaggerItem key={e.id}>
                                <Card interactive className="flex h-full flex-col p-5">
                                    <Link
                                        to={`/c/events/${e.id}`}
                                        className="absolute inset-0 z-10 rounded-lg"
                                        aria-label={`Open ${e.title}`}
                                    />
                                    <div className="flex items-center justify-between">
                                        <EventStatusBadge status={e.status} size="sm" />
                                        <span className="type-data text-[11.5px] text-faint">
                                            {formatDate(e.start_date, 'd MMM')}
                                            {e.end_date !== e.start_date &&
                                                ` – ${formatDate(e.end_date, 'd MMM')}`}
                                        </span>
                                    </div>
                                    <h3 className="type-title mt-4 text-[17px] text-text">{e.title}</h3>
                                    <p className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
                                        <MapPin className="size-3.5 shrink-0 text-faint" />
                                        <span className="truncate">{e.location}</span>
                                    </p>
                                    <div className="mt-auto pt-5">
                                        <div className="mb-2 text-[12px] text-faint">
                                            {t.shifts} {t.shifts === 1 ? 'shift' : 'shifts'}
                                        </div>
                                        {t.capacity ? (
                                            <CapacityMeter confirmed={t.confirmed} capacity={t.capacity} />
                                        ) : (
                                            <span className="text-[12.5px] text-warning-text">
                                                Add shifts so volunteers can apply
                                            </span>
                                        )}
                                    </div>
                                </Card>
                            </StaggerItem>
                        );
                    })}
                </Stagger>
            ) : (
                <Card className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] tracking-wider text-faint uppercase">
                            <tr>
                                <th className="px-5 py-3 font-medium">Event</th>
                                <th className="px-5 py-3 font-medium">Dates</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Shifts</th>
                                <th className="w-48 px-5 py-3 font-medium">Filled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {list.map((e) => {
                                const t = totals(e);
                                return (
                                    <tr
                                        key={e.id}
                                        className="cursor-pointer transition-colors hover:bg-surface-2/60"
                                        onClick={() => navigate(`/c/events/${e.id}`)}
                                    >
                                        <td className="px-5 py-3.5">
                                            <Link
                                                to={`/c/events/${e.id}`}
                                                className="font-medium text-text hover:text-accent-text"
                                                onClick={(ev) => ev.stopPropagation()}
                                            >
                                                {e.title}
                                            </Link>
                                            <div className="truncate text-[12.5px] text-faint">
                                                {e.location}
                                            </div>
                                        </td>
                                        <td className="type-data px-5 py-3.5 text-[12.5px] text-muted">
                                            {formatDate(e.start_date, 'd MMM')} –{' '}
                                            {formatDate(e.end_date, 'd MMM')}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <EventStatusBadge status={e.status} size="sm" />
                                        </td>
                                        <td className="type-data px-5 py-3.5 text-text">{t.shifts}</td>
                                        <td className="px-5 py-3.5">
                                            {t.capacity ? (
                                                <CapacityMeter
                                                    confirmed={t.confirmed}
                                                    capacity={t.capacity}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            )}

            {p && p.last_page > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setParams({ page: String(page - 1) })}
                    >
                        <ChevronLeft /> Previous
                    </Button>
                    <span className="type-data text-sm text-muted">
                        {p.current_page} / {p.last_page}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= p.last_page}
                        onClick={() => setParams({ page: String(page + 1) })}
                    >
                        Next <ChevronRight />
                    </Button>
                </nav>
            )}
        </>
    );
}
