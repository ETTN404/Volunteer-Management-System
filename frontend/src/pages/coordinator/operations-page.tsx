import {
    ArrowRight,
    CalendarDays,
    CalendarPlus,
    Clock4,
    FileCheck2,
    Inbox,
    Radar,
    Siren,
    TriangleAlert,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { formatDay, formatTime, greeting, parseApiDate } from '@/shared/lib/time';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    CapacityMeter,
    EmptyState,
    FieldMap,
    HeroBand,
    Skeleton,
    StatTile,
    heroPill,
} from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import {
    useAllOrgEvents,
    useOpsDashboard,
    usePendingHours,
    useAllApplications,
} from '@/features/operations/api';
import { useDocumentQueue } from '@/features/documents/api';
import { BroadcastDialog } from '@/features/operations/components/broadcast-dialog';
import { useSession } from '@/features/auth/use-session';
import { firstName, formatHours } from '@/shared/lib/format';

export default function OperationsPage() {
    const { user } = useSession();
    const dash = useOpsDashboard();
    const events = useAllOrgEvents();
    const apps = useAllApplications(events.data);
    const docs = useDocumentQueue('pending');
    const hours = usePendingHours();
    const [broadcast, setBroadcast] = useState(false);

    useEffect(() => {
        document.title = 'Operations · VolunTrack';
    }, []);

    const shifts = useMemo(
        () =>
            (events.data ?? [])
                .flatMap((e) =>
                    (e.shifts ?? []).map((s) => ({
                        s,
                        e,
                        start: parseApiDate(s.start_time)!,
                        end: parseApiDate(s.end_time)!,
                    })),
                )
                .sort((a, b) => a.start.getTime() - b.start.getTime()),
        [events.data],
    );
    const now = new Date();
    const today = shifts.filter(
        (x) => x.start.toDateString() === now.toDateString() || (x.start < now && x.end > now),
    );
    const upcoming = shifts
        .filter((x) => x.start > now && x.start.toDateString() !== now.toDateString())
        .slice(0, 5);
    const underfilled = shifts
        .filter((x) => x.start > now && (x.s.confirmed_count ?? 0) < x.s.capacity * 0.5)
        .slice(0, 5);
    const pending = apps.data.filter((a) => a.status === 'pending').slice(0, 5);

    return (
        <>
            <HeroBand className="mb-5">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.2)]">
                            <CalendarDays className="size-3.5" />
                            {new Date().toLocaleDateString('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </span>
                        <h1 className="mt-4 [font-family:var(--font-display)] text-[clamp(1.9rem,4.4vw,2.9rem)] leading-[1.04] font-extrabold tracking-[-0.04em]">
                            {greeting()}, {firstName(user?.full_name)}
                        </h1>
                        <p className="mt-2 max-w-xl text-[15px] opacity-85">
                            {dash.data
                                ? `${dash.data.shifts_today} ${dash.data.shifts_today === 1 ? 'shift' : 'shifts'} today${dash.data.checked_in_now != null ? ` · ${dash.data.checked_in_now} on the ground right now` : ''}.`
                                : 'Your operations at a glance.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setBroadcast(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#a8241b] shadow-lg transition-transform hover:-translate-y-0.5"
                        >
                            <Siren className="size-4" /> Urgent alert
                        </button>
                        <Link to="/c/events/new" className={heroPill}>
                            <CalendarPlus /> New event
                        </Link>
                        <Link to="/c/live" className={heroPill}>
                            <Radar /> Live shifts
                        </Link>
                        <Link to="/c/applications" className={heroPill}>
                            <Inbox /> Applications
                        </Link>
                    </div>
                </div>
            </HeroBand>

            <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StaggerItem>
                    <StatTile
                        hue="emerald"
                        icon={<Radar />}
                        label="Checked in right now"
                        value={dash.data?.checked_in_now ?? undefined}
                        to="/c/live"
                        hint={`${today.length} ${today.length === 1 ? 'shift' : 'shifts'} today`}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatTile
                        hue="amber"
                        icon={<Inbox />}
                        label="Applications to review"
                        value={dash.data?.pending_applications ?? undefined}
                        to="/c/applications"
                        hint="waiting on you"
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatTile
                        hue="rose"
                        icon={<Clock4 />}
                        label="Hours to verify"
                        value={hours.data?.length}
                        to="/c/hours"
                        hint={`${docs.data?.length ?? 0} documents to check`}
                    />
                </StaggerItem>
                <StaggerItem>
                    <StatTile
                        hue="indigo"
                        icon={<Users />}
                        label="Hours this month"
                        value={dash.data?.hours_this_month ?? undefined}
                        suffix="h"
                        hint="verified + awaiting review"
                    />
                </StaggerItem>
            </Stagger>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                {/* Today */}
                <Card className="overflow-hidden">
                    <div className="relative h-36 border-b border-line">
                        <FieldMap
                            venues={today
                                .slice(0, 3)
                                .map((t, i) => ({
                                    id: t.s.id,
                                    x: 0.66 + i * 0.13,
                                    y: 0.45 + (i % 2 ? -0.1 : 0.08),
                                    radius: 30,
                                }))}
                            pingEvery={dash.data?.checked_in_now ? 2600 : 0}
                            intensity="calm"
                            cell={18}
                            showLabels={false}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
                        <div className="absolute bottom-3 left-5">
                            <div className="type-eyebrow">Today in the field</div>
                            <div className="type-title text-lg text-text">
                                {today.length
                                    ? `${today.length} ${today.length === 1 ? 'shift' : 'shifts'}`
                                    : 'No shifts today'}
                            </div>
                        </div>
                    </div>
                    <ul className="divide-y divide-line">
                        {events.isLoading && <Skeleton className="m-5 h-20" />}
                        {today.map(({ s, e, start, end }) => {
                            const live = start <= now && end > now;
                            return (
                                <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                                    <div className="type-data w-14 shrink-0 text-sm text-text">
                                        {formatTime(start)}
                                        <div className="text-[11px] text-faint">{formatTime(end)}</div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-[14.5px] font-medium text-text">
                                                {e.title}
                                            </span>
                                            {live && (
                                                <Badge tone="success" size="sm" dot pulse>
                                                    Live
                                                </Badge>
                                            )}
                                        </div>
                                        <CapacityMeter
                                            confirmed={s.confirmed_count}
                                            capacity={s.capacity}
                                            className="mt-2 max-w-60"
                                        />
                                    </div>
                                    <Button asChild size="sm" variant={live ? 'primary' : 'secondary'}>
                                        <Link to={`/c/live/${s.id}`}>{live ? 'Open live' : 'Prepare'}</Link>
                                    </Button>
                                </li>
                            );
                        })}
                        {!events.isLoading && today.length === 0 && (
                            <li className="px-5 py-6 text-center text-sm text-muted">
                                Nothing scheduled today.
                            </li>
                        )}
                    </ul>
                    {upcoming.length > 0 && (
                        <div className="border-t border-line px-5 py-4">
                            <div className="type-eyebrow mb-3">Coming up</div>
                            <ul className="space-y-2.5">
                                {upcoming.map(({ s, e, start }) => (
                                    <li key={s.id}>
                                        <Link
                                            to={`/c/events/${e.id}`}
                                            className="group flex items-center gap-3 text-[13.5px]"
                                        >
                                            <span className="type-data w-24 shrink-0 text-faint">
                                                {formatDay(start)}
                                            </span>
                                            <span className="flex-1 truncate text-text group-hover:text-accent-text">
                                                {e.title}
                                            </span>
                                            <span className="type-data text-[12px] text-muted">
                                                {s.confirmed_count ?? 0}/{s.capacity}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader
                            title="Waiting on you"
                            action={
                                <Link
                                    to="/c/applications"
                                    className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline"
                                >
                                    Review all <ArrowRight className="size-3.5" />
                                </Link>
                            }
                        />
                        <ul className="mt-3 divide-y divide-line px-5 pb-2">
                            {pending.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-[14px] font-medium text-text">
                                            {a.volunteer?.user?.full_name}
                                        </div>
                                        <div className="truncate text-[12.5px] text-faint">
                                            {a.event.title} · {formatDay(a.shift?.start_time)}
                                        </div>
                                    </div>
                                    <Badge tone="warning" size="sm">
                                        Pending
                                    </Badge>
                                </li>
                            ))}
                            {!apps.isLoading && pending.length === 0 && (
                                <li className="py-6 text-center text-sm text-muted">
                                    No applications waiting.
                                </li>
                            )}
                        </ul>
                        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
                            <Link
                                to="/c/documents"
                                className="flex items-center gap-2.5 bg-surface px-5 py-3.5 text-[13px] text-muted transition-colors hover:text-text"
                            >
                                <FileCheck2 className="size-4 text-faint" /> {docs.data?.length ?? '—'}{' '}
                                documents to check
                            </Link>
                            <Link
                                to="/c/hours"
                                className="flex items-center gap-2.5 bg-surface px-5 py-3.5 text-[13px] text-muted transition-colors hover:text-text"
                            >
                                <Clock4 className="size-4 text-faint" />{' '}
                                {hours.data ? formatHours(hours.data.reduce((n, h) => n + h.hours, 0)) : '—'}{' '}
                                to verify
                            </Link>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Under-filled shifts"
                            description="Upcoming shifts below half capacity"
                        />
                        <ul className="mt-2 space-y-1 px-3 pb-3">
                            {underfilled.map(({ s, e }) => (
                                <li
                                    key={s.id}
                                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2"
                                >
                                    <TriangleAlert className="size-4 shrink-0 text-warning" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[13.5px] font-medium text-text">
                                            {e.title}
                                        </div>
                                        <div className="text-[12px] text-faint">
                                            {formatDay(s.start_time)} · {s.confirmed_count ?? 0}/{s.capacity}{' '}
                                            confirmed
                                        </div>
                                    </div>
                                    <Button size="xs" variant="ghost" onClick={() => setBroadcast(true)}>
                                        Alert
                                    </Button>
                                </li>
                            ))}
                            {!events.isLoading && underfilled.length === 0 && (
                                <li>
                                    <EmptyState
                                        compact
                                        title="Every upcoming shift is at least half full"
                                        className="shadow-none"
                                    />
                                </li>
                            )}
                        </ul>
                    </Card>
                </div>
            </div>

            <BroadcastDialog events={events.data ?? []} open={broadcast} onOpenChange={setBroadcast} />
        </>
    );
}
