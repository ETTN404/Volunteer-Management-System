import { Ban, CalendarClock, Check, CheckCircle2, Copy, Sparkles, Target, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { ShiftAssignment, VmsEvent } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatDay, formatRelative, formatTimeRange } from '@/shared/lib/time';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { matchScore, skillDiff } from '@/shared/lib/skills';
import { errorMessage } from '@/shared/api/http';
import {
    AssignmentBadge,
    Avatar,
    Badge,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    EmptyState,
    Field,
    IconTile,
    InlineAlert,
    Sheet,
    SheetContent,
    Skeleton,
    Stepper,
    Textarea,
    notify,
    type Hue,
} from '@/shared/ui';
import { MatchBadge } from '@/features/volunteer/components/match-badge';
import { useAiFeedback, useDecideApplication } from '../api';

export type ApplicationRowData = ShiftAssignment & { event: VmsEvent };

const STEP_OF: Record<string, number> = {
    pending: 1,
    waitlisted: 1,
    confirmed: 2,
    rejected: 1,
    cancelled: 1,
    removed: 2,
};

function InfoCard({
    icon,
    hue,
    title,
    action,
    children,
}: {
    icon: React.ReactNode;
    hue: Hue;
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[18px] bg-surface p-4 [box-shadow:0_1px_2px_rgba(17,21,43,0.03),inset_0_0_0_1px_var(--line)]">
            <div className="mb-3 flex items-center gap-2.5">
                <IconTile hue={hue} size="sm">
                    {icon}
                </IconTile>
                <h3 className="flex-1 text-[14.5px] font-semibold text-text">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[12px] text-muted">{label}</dt>
            <dd className="mt-0.5 truncate text-[14px] font-semibold text-text">{children}</dd>
        </div>
    );
}

/** Review drawer: who, which shift, how well they fit, a drafted reply — and the decision bar. */
function ApplicationDrawer({
    app,
    onClose,
    onDecide,
    deciding,
}: {
    app: ApplicationRowData | null;
    onClose: () => void;
    onDecide: (a: ApplicationRowData, s: 'confirmed' | 'rejected', reason?: string) => void;
    deciding: boolean;
}) {
    const fb = useAiFeedback(app?.id ?? null);
    const v = app?.volunteer;
    const skills = v?.skills ?? [];
    const required = app?.shift?.required_skills ?? [];
    const { matched, missing } = skillDiff(skills, required);
    const declined = Boolean(app && ['rejected', 'cancelled'].includes(app.status));
    const name = v?.user?.full_name ?? 'Applicant';
    return (
        <Sheet open={Boolean(app)} onOpenChange={(o) => !o && onClose()}>
            <SheetContent
                title={name}
                description={app ? app.event.title : undefined}
                width="xl"
                bodyClassName="space-y-4 bg-surface-2/60"
                header={
                    app && (
                        <div className="px-6 pt-6 pb-5">
                            <div className="flex items-start gap-4 pr-12">
                                <Avatar name={name} src={v?.user?.profile_photo_url} size="lg" />
                                <div className="min-w-0">
                                    <h2 className="truncate [font-family:var(--font-display)] text-[22px] font-extrabold tracking-[-0.03em] text-text">
                                        {name}
                                    </h2>
                                    <p className="truncate text-[13px] text-muted">
                                        Applying for {app.event.title} · #{app.id}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <AssignmentBadge status={app.status} size="sm" />
                                        <span className="text-[12px] text-faint">
                                            Applied {formatRelative(app.applied_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Stepper
                                className="mt-6"
                                steps={['Applied', 'Review', 'Confirmed', 'Checked in', 'Hours verified']}
                                current={STEP_OF[app.status] ?? 1}
                                tone={declined ? 'danger' : app.status === 'waitlisted' ? 'sky' : 'amber'}
                            />
                        </div>
                    )
                }
                footer={
                    app?.status === 'pending' ? (
                        <>
                            <Button
                                size="lg"
                                className="flex-1"
                                loading={deciding}
                                onClick={() => onDecide(app, 'confirmed')}
                            >
                                <CheckCircle2 /> Approve
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-danger-text [box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_45%,transparent)]"
                                onClick={() =>
                                    onDecide(
                                        app,
                                        'rejected',
                                        fb.data?.missing_skills.length
                                            ? fb.data.ai_drafted_feedback
                                            : undefined,
                                    )
                                }
                            >
                                <Ban /> Decline
                            </Button>
                        </>
                    ) : undefined
                }
            >
                {app && v && (
                    <>
                        <div
                            className={cn(
                                'flex items-center gap-2 rounded-[14px] px-4 py-3 text-[13px] font-medium',
                                declined
                                    ? 'bg-danger-soft text-danger-text'
                                    : app.status === 'confirmed'
                                      ? 'bg-success-soft text-success-text'
                                      : 'bg-warning-soft text-warning-text',
                            )}
                        >
                            <span className="size-1.5 shrink-0 rounded-full bg-current" />
                            {app.status === 'pending'
                                ? missing.length
                                    ? `Missing ${missing.map(humanizeSkill).join(', ')} — ask for proof or approve anyway.`
                                    : 'Has every skill this shift needs. Ready to approve.'
                                : app.status === 'confirmed'
                                  ? 'Approved. The volunteer has been notified.'
                                  : app.status === 'waitlisted'
                                    ? 'On the waitlist — moves up automatically when a place frees up.'
                                    : 'Closed. The volunteer saw your note on their schedule.'}
                        </div>

                        <InfoCard
                            icon={<UserRound />}
                            hue="indigo"
                            title="Applicant"
                            action={
                                <Link
                                    to={`/c/volunteers/${v.id}`}
                                    className="text-[13px] font-medium text-accent-text hover:underline"
                                >
                                    Full profile
                                </Link>
                            }
                        >
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <Detail label="Email">{v.user?.email ?? '—'}</Detail>
                                <Detail label="Phone">{v.user?.phone ?? '—'}</Detail>
                                <Detail label="Hours logged">{formatHours(v.total_hours)}</Detail>
                                <Detail label="Impact score">{v.impact_score.toFixed(1)}</Detail>
                            </dl>
                            {v.bio && (
                                <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-muted">
                                    {v.bio}
                                </p>
                            )}
                        </InfoCard>

                        <InfoCard icon={<CalendarClock />} hue="amber" title="Shift">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <Detail label="Event">{app.event.title}</Detail>
                                <Detail label="When">
                                    {formatDay(app.shift?.start_time)} ·{' '}
                                    {app.shift && formatTimeRange(app.shift.start_time, app.shift.end_time)}
                                </Detail>
                                <Detail label="Where">{app.event.location}</Detail>
                                <Detail label="Places">
                                    {app.shift?.confirmed_count ?? 0} / {app.shift?.capacity ?? '—'} confirmed
                                </Detail>
                            </dl>
                        </InfoCard>

                        <InfoCard
                            icon={<Target />}
                            hue="emerald"
                            title="Skill fit"
                            action={<MatchBadge score={matchScore(skills, required)} size="md" />}
                        >
                            <div className="flex flex-wrap gap-1.5">
                                {required.length === 0 && (
                                    <span className="text-sm text-muted">No skills required.</span>
                                )}
                                {matched.map((sk) => (
                                    <span
                                        key={sk}
                                        className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-medium text-success-text"
                                    >
                                        <Check className="size-3" /> {humanizeSkill(sk)}
                                    </span>
                                ))}
                                {missing.map((sk) => (
                                    <span
                                        key={sk}
                                        className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-[12px] font-medium text-danger-text"
                                    >
                                        <X className="size-3" /> {humanizeSkill(sk)}
                                    </span>
                                ))}
                            </div>
                        </InfoCard>

                        <InfoCard
                            icon={<Sparkles />}
                            hue="violet"
                            title="Suggested reply"
                            action={
                                fb.data && (
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() =>
                                            navigator.clipboard
                                                .writeText(fb.data!.ai_drafted_feedback)
                                                .then(() => notify.success('Reply copied'))
                                        }
                                    >
                                        <Copy /> Copy
                                    </Button>
                                )
                            }
                        >
                            {fb.isLoading ? (
                                <Skeleton className="h-16" />
                            ) : fb.error ? (
                                <p className="text-sm text-danger-text">{errorMessage(fb.error)}</p>
                            ) : (
                                <p className="text-[14px] leading-relaxed text-text">
                                    {fb.data?.ai_drafted_feedback}
                                </p>
                            )}
                        </InfoCard>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

export function ApplicationsTable({
    rows,
    isLoading,
    showEvent = true,
    bare,
}: {
    rows: ApplicationRowData[];
    isLoading?: boolean;
    showEvent?: boolean;
    /** Inside a card: no frame of its own. */
    bare?: boolean;
}) {
    const decide = useDecideApplication();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [open, setOpen] = useState<ApplicationRowData | null>(null);
    const [declining, setDeclining] = useState<{ app: ApplicationRowData; reason: string } | null>(null);
    const pendingIds = rows.filter((r) => r.status === 'pending').map((r) => r.id);

    const run = async (app: ApplicationRowData, status: 'confirmed' | 'rejected', reason?: string) => {
        try {
            await decide.mutateAsync({ assignmentId: app.id, status, reason });
            notify.success(
                status === 'confirmed' ? 'Approved' : 'Declined',
                `${app.volunteer?.user?.full_name} · ${app.event.title}`,
            );
            setOpen(null);
            setDeclining(null);
            setSelected((s) => {
                const n = new Set(s);
                n.delete(app.id);
                return n;
            });
        } catch (e) {
            notify.error(e);
        }
    };

    const bulkApprove = async () => {
        const targets = rows.filter((r) => selected.has(r.id));
        let ok = 0;
        for (const t of targets) {
            try {
                await decide.mutateAsync({ assignmentId: t.id, status: 'confirmed' });
                ok++;
            } catch (e) {
                notify.error(e, `${t.volunteer?.user?.full_name}: couldn’t approve`);
            }
        }
        if (ok) notify.success(`${ok} ${ok === 1 ? 'volunteer' : 'volunteers'} approved`);
        setSelected(new Set());
    };

    if (isLoading) return <Skeleton className={cn('h-64', bare ? 'rounded-none' : 'rounded-xl')} />;
    if (rows.length === 0)
        return (
            <EmptyState
                icon={<Check />}
                title="No applications here"
                description="New applications appear as volunteers apply for shifts."
            />
        );

    return (
        <>
            {selected.size > 0 && (
                <div
                    className={cn(
                        'flex items-center gap-3 bg-accent-soft px-4 py-2.5',
                        !bare && 'mb-3 rounded-[14px]',
                    )}
                >
                    <span className="text-sm font-medium text-accent-text">{selected.size} selected</span>
                    <Button
                        size="xs"
                        variant="success"
                        className="ml-auto"
                        onClick={bulkApprove}
                        loading={decide.isPending}
                    >
                        <Check /> Approve selected
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
                        Clear
                    </Button>
                </div>
            )}
            <div
                className={cn(
                    'overflow-x-auto bg-surface',
                    !bare && 'rounded-[20px] [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]',
                )}
            >
                <table className="w-full min-w-[820px] text-sm">
                    <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] font-semibold tracking-wider text-faint uppercase">
                        <tr>
                            <th className="w-10 px-4 py-3">
                                <Checkbox
                                    aria-label="Select all pending"
                                    checked={
                                        pendingIds.length > 0 && pendingIds.every((id) => selected.has(id))
                                    }
                                    onCheckedChange={(c) => setSelected(c ? new Set(pendingIds) : new Set())}
                                />
                            </th>
                            <th className="min-w-[230px] px-3 py-3 font-medium">Volunteer</th>
                            <th className="px-3 py-3 font-medium">{showEvent ? 'Shift' : 'Shift time'}</th>
                            <th className="px-3 py-3 font-medium">Fit</th>
                            <th className="px-3 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 text-right font-medium">Decision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {rows.map((a) => {
                            const v = a.volunteer;
                            const required = a.shift?.required_skills ?? [];
                            const { missing } = skillDiff(v?.skills ?? [], required);
                            return (
                                <tr
                                    key={a.id}
                                    className={cn(
                                        'transition-colors hover:bg-surface-2/50',
                                        selected.has(a.id) && 'bg-accent-soft/40',
                                    )}
                                >
                                    <td className="px-4 py-3">
                                        {a.status === 'pending' && (
                                            <Checkbox
                                                aria-label={`Select ${v?.user?.full_name}`}
                                                checked={selected.has(a.id)}
                                                onCheckedChange={(c) =>
                                                    setSelected((s) => {
                                                        const n = new Set(s);
                                                        if (c) n.add(a.id);
                                                        else n.delete(a.id);
                                                        return n;
                                                    })
                                                }
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        <button
                                            className="flex items-center gap-3 text-left"
                                            onClick={() => setOpen(a)}
                                        >
                                            <Avatar
                                                name={v?.user?.full_name ?? '?'}
                                                src={v?.user?.profile_photo_url}
                                                size="md"
                                            />
                                            <span>
                                                <span className="block font-semibold whitespace-nowrap text-text hover:text-accent-text">
                                                    {v?.user?.full_name}
                                                </span>
                                                <span className="block text-[12px] text-faint">
                                                    {formatHours(v?.total_hours ?? 0)} · applied{' '}
                                                    {formatRelative(a.applied_at)}
                                                </span>
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-3 py-3">
                                        {showEvent && (
                                            <div className="max-w-56 truncate font-medium text-text">
                                                {a.event.title}
                                            </div>
                                        )}
                                        <div className="text-[12.5px] text-muted">
                                            {formatDay(a.shift?.start_time)} ·{' '}
                                            {a.shift && formatTimeRange(a.shift.start_time, a.shift.end_time)}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex flex-col items-start gap-1">
                                            <MatchBadge score={matchScore(v?.skills ?? [], required)} />
                                            {missing.length > 0 && (
                                                <span className="text-[11.5px] text-faint">
                                                    missing {missing.map(humanizeSkill).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <AssignmentBadge status={a.status} size="sm" />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {a.status === 'pending' ? (
                                            <div className="inline-flex gap-1.5">
                                                <Button size="xs" variant="ghost" onClick={() => setOpen(a)}>
                                                    <Sparkles /> Review
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="success"
                                                    onClick={() => run(a, 'confirmed')}
                                                    loading={
                                                        decide.isPending &&
                                                        decide.variables?.assignmentId === a.id &&
                                                        decide.variables.status === 'confirmed'
                                                    }
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    onClick={() => setDeclining({ app: a, reason: '' })}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge size="sm">
                                                {a.status === 'confirmed' ? 'Approved' : 'Closed'}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ApplicationDrawer
                app={open}
                deciding={decide.isPending}
                onClose={() => setOpen(null)}
                onDecide={(a, s, reason) =>
                    s === 'rejected' ? setDeclining({ app: a, reason: reason ?? '' }) : run(a, s)
                }
            />

            <Dialog open={Boolean(declining)} onOpenChange={(o) => !o && setDeclining(null)}>
                <DialogContent
                    title="Decline this application?"
                    description={
                        declining
                            ? `${declining.app.volunteer?.user?.full_name} · ${declining.app.event.title}`
                            : undefined
                    }
                    size="sm"
                >
                    {declining && (
                        <>
                            <Field
                                label="Note to the volunteer"
                                optional
                                hint="Shown on their schedule. Be kind and specific."
                            >
                                <Textarea
                                    rows={4}
                                    value={declining.reason}
                                    maxLength={500}
                                    onChange={(e) => setDeclining({ ...declining, reason: e.target.value })}
                                />
                            </Field>
                            {decide.error && (
                                <InlineAlert tone="danger" className="mt-3">
                                    {errorMessage(decide.error)}
                                </InlineAlert>
                            )}
                            <DialogActions>
                                <Button variant="ghost" onClick={() => setDeclining(null)}>
                                    Keep pending
                                </Button>
                                <Button
                                    variant="danger"
                                    loading={decide.isPending}
                                    onClick={() =>
                                        run(declining.app, 'rejected', declining.reason.trim() || undefined)
                                    }
                                >
                                    Decline
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
