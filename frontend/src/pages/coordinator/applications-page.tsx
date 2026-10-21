import { Ban, CheckCircle2, Hourglass, ListOrdered, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AssignmentStatus } from '@/shared/types/api';
import {
    Card,
    DistributionBar,
    ErrorState,
    FilterChips,
    Input,
    PageHeader,
    Select,
    StatTile,
} from '@/shared/ui';
import { useAllApplications, useAllOrgEvents } from '@/features/operations/api';
import { ApplicationsTable } from '@/features/operations/components/applications-table';
import { matchScore } from '@/shared/lib/skills';

type StatusFilter = AssignmentStatus | 'all';

export default function ApplicationsPage() {
    const events = useAllOrgEvents();
    const apps = useAllApplications(events.data);
    const [status, setStatus] = useState<StatusFilter>('pending');
    const [eventId, setEventId] = useState('all');
    const [q, setQ] = useState('');
    const [sort, setSort] = useState<'fit' | 'soonest' | 'newest'>('fit');

    useEffect(() => {
        document.title = 'Applications · VolunTrack';
    }, []);

    const counts = useMemo(() => {
        const by = (s: AssignmentStatus[]) => apps.data.filter((a) => s.includes(a.status)).length;
        return {
            pending: by(['pending']),
            confirmed: by(['confirmed']),
            waitlisted: by(['waitlisted']),
            declined: by(['rejected', 'cancelled', 'removed']),
            all: apps.data.length,
        };
    }, [apps.data]);

    const rows = useMemo(() => {
        let r = apps.data;
        if (status === 'rejected')
            r = r.filter((a) => ['rejected', 'cancelled', 'removed'].includes(a.status));
        else if (status !== 'all') r = r.filter((a) => a.status === status);
        if (eventId !== 'all') r = r.filter((a) => a.event.id === Number(eventId));
        if (q.trim())
            r = r.filter((a) =>
                `${a.volunteer?.user?.full_name} ${a.event.title}`
                    .toLowerCase()
                    .includes(q.trim().toLowerCase()),
            );
        const fit = (a: (typeof r)[number]) =>
            matchScore(a.volunteer?.skills ?? [], a.shift?.required_skills ?? []);
        return [...r].sort((a, b) =>
            sort === 'fit'
                ? fit(b) - fit(a)
                : sort === 'soonest'
                  ? (a.shift?.start_time ?? '').localeCompare(b.shift?.start_time ?? '')
                  : b.applied_at.localeCompare(a.applied_at),
        );
    }, [apps.data, status, eventId, q, sort]);

    const loading = events.isLoading || apps.isLoading;

    return (
        <>
            <PageHeader
                title="Review applications"
                description="Approve the best fit for each shift. Skill gaps are highlighted so you can ask for proof before confirming."
            />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatTile
                    hue="amber"
                    icon={<Hourglass />}
                    label="Waiting on you"
                    value={loading ? undefined : counts.pending}
                    hint="pending applications"
                />
                <StatTile
                    hue="emerald"
                    icon={<CheckCircle2 />}
                    label="Approved"
                    value={loading ? undefined : counts.confirmed}
                    hint="places confirmed"
                />
                <StatTile
                    hue="sky"
                    icon={<ListOrdered />}
                    label="On waitlist"
                    value={loading ? undefined : counts.waitlisted}
                    hint="move up automatically"
                />
                <StatTile
                    hue="rose"
                    icon={<Ban />}
                    label="Declined"
                    value={loading ? undefined : counts.declined}
                    hint={`${counts.all} applications total`}
                />
            </div>

            <Card className="overflow-hidden">
                <div className="space-y-4 p-4 sm:p-5">
                    <DistributionBar
                        segments={[
                            { value: counts.confirmed, hue: 'emerald', label: 'Approved' },
                            { value: counts.pending, hue: 'amber', label: 'Pending' },
                            { value: counts.waitlisted, hue: 'sky', label: 'Waitlist' },
                            { value: counts.declined, hue: 'rose', label: 'Declined' },
                        ]}
                    />
                    <FilterChips<StatusFilter>
                        value={status}
                        onChange={setStatus}
                        aria-label="Status"
                        options={[
                            { value: 'pending', label: 'Pending', count: counts.pending, hue: 'amber' },
                            {
                                value: 'confirmed',
                                label: 'Approved',
                                count: counts.confirmed,
                                hue: 'emerald',
                            },
                            { value: 'waitlisted', label: 'Waitlist', count: counts.waitlisted, hue: 'sky' },
                            { value: 'rejected', label: 'Declined', count: counts.declined, hue: 'rose' },
                            { value: 'all', label: 'All', count: counts.all },
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-3 border-y border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center sm:px-5">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search volunteer or event"
                        leading={<Search />}
                        className="sm:w-72"
                        aria-label="Search applications"
                    />
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <div className="sm:w-56">
                            <Select
                                aria-label="Event"
                                value={eventId}
                                onValueChange={setEventId}
                                options={[
                                    { value: 'all', label: 'All events' },
                                    ...(events.data ?? []).map((e) => ({
                                        value: String(e.id),
                                        label: e.title,
                                    })),
                                ]}
                            />
                        </div>
                        <div className="sm:w-44">
                            <Select
                                aria-label="Sort applications"
                                value={sort}
                                onValueChange={(v) => setSort(v as typeof sort)}
                                options={[
                                    { value: 'fit', label: 'Best fit first' },
                                    { value: 'soonest', label: 'Soonest shift' },
                                    { value: 'newest', label: 'Newest first' },
                                ]}
                            />
                        </div>
                        <span className="text-[13px] whitespace-nowrap text-muted">{rows.length} shown</span>
                    </div>
                </div>
                {events.error ? (
                    <ErrorState error={events.error} onRetry={() => events.refetch()} className="m-5" />
                ) : (
                    <ApplicationsTable rows={rows} isLoading={loading} bare />
                )}
            </Card>
        </>
    );
}
