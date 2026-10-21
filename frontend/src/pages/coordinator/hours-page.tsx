import { Check, CheckCheck, Clock4, PencilLine, ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AttendanceFlag } from '@/shared/types/api';
import { formatDate, formatTime } from '@/shared/lib/time';
import { formatHours } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { cn } from '@/shared/lib/cn';
import {
    Avatar,
    Badge,
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    EmptyState,
    ErrorState,
    Field,
    FilterChips,
    InlineAlert,
    Input,
    PageHeader,
    Skeleton,
    Textarea,
    notify,
} from '@/shared/ui';
import { usePendingHours, useVerifyHours, type PendingHours } from '@/features/operations/api';

const FLAG: Partial<Record<AttendanceFlag, { text: string; risky?: boolean }>> = {
    left_early: { text: 'Left early', risky: true },
    auto_checked_out: { text: 'Forgot to check out — closed at shift end', risky: true },
    checked_out_off_site: { text: 'Checked out away from venue', risky: true },
    left_venue_during_shift: { text: 'Phone left the venue mid-shift', risky: true },
    low_presence: { text: 'Few location pings', risky: true },
    shared_device: { text: 'Same phone as another volunteer', risky: true },
    manual_check_in: { text: 'Checked in by staff' },
    id_checked: { text: 'ID checked' },
    resumed: { text: 'Resumed after mistaken check-out' },
    reopened_by_staff: { text: 'Re-opened by staff' },
};

type Tab = 'pending' | 'verified' | 'adjusted' | 'rejected';

export default function HoursPage() {
    const [tab, setTab] = useState<Tab>('pending');
    const list = usePendingHours(tab);
    const verify = useVerifyHours();
    const [adjusting, setAdjusting] = useState<{ row: PendingHours; hours: string; note: string } | null>(
        null,
    );
    const [rejecting, setRejecting] = useState<{ row: PendingHours; note: string } | null>(null);
    const [bulk, setBulk] = useState(false);

    useEffect(() => {
        document.title = 'Verify hours · VolunTrack';
    }, []);

    const rows = list.data ?? [];
    const isRisky = (r: PendingHours) => (r.flags ?? []).some((f) => FLAG[f]?.risky);
    const clean = useMemo(() => rows.filter((r) => !isRisky(r)), [rows]);

    const act = (
        row: PendingHours,
        status: 'verified' | 'rejected' | 'adjusted',
        extra: { verified_hours?: number; note?: string } = {},
    ) =>
        verify.mutateAsync({ id: row.id, status, ...extra }).then(
            () => {
                setAdjusting(null);
                setRejecting(null);
            },
            (e) => {
                notify.error(errorMessage(e));
                throw e;
            },
        );

    const verifyAllClean = async () => {
        setBulk(true);
        let ok = 0;
        for (const r of clean) {
            try {
                await verify.mutateAsync({ id: r.id, status: 'verified' });
                ok++;
            } catch {
                /* reported per row */
            }
        }
        setBulk(false);
        notify.success(`${ok} attendances verified`);
    };

    const total = rows.reduce((n, r) => n + (tab === 'pending' ? r.hours : (r.verified_hours ?? 0)), 0);

    return (
        <>
            <PageHeader
                title="Hours sign-off"
                description="Hours only count toward reports, impact and certificates after you verify them. Flags show what to look at."
            />
            <FilterChips
                className="mb-5"
                value={tab}
                onChange={setTab}
                aria-label="Status"
                options={[
                    {
                        value: 'pending',
                        label: 'To review',
                        hue: 'amber',
                        count: tab === 'pending' && !list.isLoading ? rows.length : undefined,
                    },
                    { value: 'verified', label: 'Verified', hue: 'emerald' },
                    { value: 'adjusted', label: 'Adjusted', hue: 'sky' },
                    { value: 'rejected', label: 'Not counted', hue: 'rose' },
                ]}
            />

            {tab === 'pending' && rows.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[18px] bg-surface px-4 py-3 [box-shadow:0_8px_24px_-18px_rgba(17,21,43,0.25),inset_0_0_0_1px_var(--line)]">
                    <Badge tone="warning">
                        {formatHours(total)} across {rows.length} check-ins
                    </Badge>
                    <span className="text-sm text-muted">{clean.length} have no warnings.</span>
                    <Button
                        size="sm"
                        className="ml-auto"
                        variant="success"
                        disabled={clean.length === 0}
                        loading={bulk}
                        onClick={verifyAllClean}
                    >
                        <CheckCheck /> Verify {clean.length} clean
                    </Button>
                </div>
            )}

            {list.isLoading ? (
                <Skeleton className="h-72 rounded-xl" />
            ) : list.error ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<Clock4 />}
                    title={tab === 'pending' ? 'All hours are reviewed' : 'Nothing here yet'}
                    description={tab === 'pending' ? 'New check-outs land here for your review.' : undefined}
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((r) => {
                        const flags = (r.flags ?? []).filter((f) => FLAG[f]);
                        const busy = verify.isPending && verify.variables?.id === r.id;
                        return (
                            <Card
                                key={r.id}
                                className={cn(
                                    'min-w-0 p-4 sm:p-5',
                                    isRisky(r) &&
                                        tab === 'pending' &&
                                        '[box-shadow:inset_0_0_0_1px_var(--warning)]',
                                )}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <Avatar
                                            name={r.volunteer.user?.full_name ?? '?'}
                                            src={r.volunteer.user?.profile_photo_url}
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-text">
                                                {r.volunteer.user?.full_name}
                                            </div>
                                            <div className="truncate text-[12.5px] text-muted">
                                                {r.shift.event.title}
                                                {r.shift.title ? ` · ${r.shift.title}` : ''} ·{' '}
                                                {formatDate(r.check_in_time, 'EEE d MMM')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-[12.5px] lg:w-[360px]">
                                        <div>
                                            <div className="text-faint">Scheduled</div>
                                            <div className="type-data text-text">
                                                {formatTime(r.shift.start_time)}–
                                                {formatTime(r.shift.end_time)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-faint">On site</div>
                                            <div className="type-data text-text">
                                                {formatTime(r.check_in_time)}–{formatTime(r.check_out_time)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-faint">
                                                {tab === 'pending' ? 'Recorded' : 'Counted'}
                                            </div>
                                            <div className="type-data font-semibold text-text">
                                                {formatHours(
                                                    tab === 'pending' ? r.hours : (r.verified_hours ?? 0),
                                                )}
                                                <span className="ml-1 font-normal text-faint">
                                                    / {formatHours(r.scheduled_hours)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {tab === 'pending' && (
                                        <div className="flex gap-1.5 lg:justify-end">
                                            <Button
                                                size="sm"
                                                variant="success"
                                                loading={busy && verify.variables?.status === 'verified'}
                                                onClick={() =>
                                                    act(r, 'verified').then(() =>
                                                        notify.success('Hours verified'),
                                                    )
                                                }
                                            >
                                                <Check /> Verify
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    setAdjusting({
                                                        row: r,
                                                        hours: Math.min(r.hours, r.scheduled_hours).toFixed(
                                                            2,
                                                        ),
                                                        note: '',
                                                    })
                                                }
                                            >
                                                <PencilLine /> Adjust
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                aria-label="Don’t count these hours"
                                                onClick={() => setRejecting({ row: r, note: '' })}
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {(flags.length > 0 ||
                                    Boolean(r.check_out_reason) ||
                                    Boolean(r.verification_note) ||
                                    (r.presence?.pings ?? 0) > 0) && (
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px]">
                                        {flags.map((f) => (
                                            <span
                                                key={f}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium',
                                                    FLAG[f]!.risky
                                                        ? 'bg-warning-soft text-warning-text'
                                                        : 'bg-surface-2 text-muted',
                                                )}
                                            >
                                                {FLAG[f]!.risky && <ShieldAlert className="size-3" />}
                                                {FLAG[f]!.text}
                                            </span>
                                        ))}
                                        {r.presence && r.presence.pings > 0 && (
                                            <span className="text-muted">
                                                {r.presence.inside}/{r.presence.pings} location pings at the
                                                venue
                                            </span>
                                        )}
                                        {r.check_out_reason && (
                                            <span className="w-full text-muted">
                                                Reason given: “{r.check_out_reason}”
                                            </span>
                                        )}
                                        {r.verification_note && (
                                            <span className="w-full text-muted">
                                                Note: {r.verification_note}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={Boolean(adjusting)} onOpenChange={(o) => !o && setAdjusting(null)}>
                <DialogContent
                    title="Adjust the hours that count"
                    description={
                        adjusting
                            ? `${adjusting.row.volunteer.user?.full_name} · recorded ${formatHours(adjusting.row.hours)}, scheduled ${formatHours(adjusting.row.scheduled_hours)}`
                            : undefined
                    }
                    size="sm"
                >
                    {adjusting && (
                        <div className="space-y-4">
                            <Field label="Hours to count">
                                <Input
                                    type="number"
                                    step="0.25"
                                    min={0}
                                    max={24}
                                    value={adjusting.hours}
                                    onChange={(e) => setAdjusting({ ...adjusting, hours: e.target.value })}
                                />
                            </Field>
                            <Field label="Note to the volunteer" optional>
                                <Textarea
                                    rows={2}
                                    value={adjusting.note}
                                    onChange={(e) => setAdjusting({ ...adjusting, note: e.target.value })}
                                    placeholder="e.g. Left at 12:30 to catch the bus"
                                />
                            </Field>
                            {verify.error && (
                                <InlineAlert tone="danger">{errorMessage(verify.error)}</InlineAlert>
                            )}
                            <DialogActions>
                                <Button variant="ghost" onClick={() => setAdjusting(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    disabled={
                                        !(Number(adjusting.hours) >= 0 && Number(adjusting.hours) <= 24)
                                    }
                                    loading={verify.isPending}
                                    onClick={() =>
                                        act(adjusting.row, 'adjusted', {
                                            verified_hours: Number(adjusting.hours),
                                            note: adjusting.note || undefined,
                                        }).then(() => notify.success('Hours adjusted'))
                                    }
                                >
                                    Save hours
                                </Button>
                            </DialogActions>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
                <DialogContent
                    title="Don’t count these hours?"
                    description={
                        rejecting ? `${rejecting.row.volunteer.user?.full_name} is told why.` : undefined
                    }
                    size="sm"
                >
                    {rejecting && (
                        <>
                            <Textarea
                                rows={3}
                                value={rejecting.note}
                                onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })}
                                placeholder="e.g. Was not at the venue during the shift"
                                aria-label="Reason"
                            />
                            <DialogActions>
                                <Button variant="ghost" onClick={() => setRejecting(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    disabled={rejecting.note.trim().length < 3}
                                    loading={verify.isPending}
                                    onClick={() =>
                                        act(rejecting.row, 'rejected', { note: rejecting.note.trim() }).then(
                                            () => notify.success('Hours not counted'),
                                        )
                                    }
                                >
                                    Don’t count
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
