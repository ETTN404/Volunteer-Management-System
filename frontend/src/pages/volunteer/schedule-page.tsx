import { CalendarX2, CheckCircle2, Clock, History, LogOut, MapPin, QrCode, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { durationHours, formatDate, formatDay, formatTime, formatTimeRange } from '@/shared/lib/time';
import { formatHours } from '@/shared/lib/format';
import { useNow } from '@/shared/hooks/use-now';
import { AssignmentBadge, Badge, Button, Card, DistributionBar, EmptyState, ErrorState, FilterChips, PageHeader, SkeletonCard, StatTile, notify } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useWithdrawApplication } from '@/features/volunteer/api';
import { useT } from '@/shared/i18n';
import { shiftPhase, useMyShifts, type ScheduledShift } from '@/features/volunteer/derived';

const HOURS_STATUS = {
  pending: { tone: 'warning', label: 'Awaiting verification' },
  verified: { tone: 'success', label: 'Verified' },
  adjusted: { tone: 'info', label: 'Adjusted' },
  rejected: { tone: 'danger', label: 'Not counted' },
} as const;

function UpcomingRow({ s }: { s: ScheduledShift }) {
  const t = useT();
  const now = useNow(15_000);
  const withdraw = useWithdrawApplication();
  const phase = shiftPhase(s, now);
  const canCheckIn = phase === 'check-in-open';
  const opensAt = new Date(s.start.getTime() - 15 * 60_000);

  return (
    <Card className={cn('flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5', (canCheckIn || phase === 'on-shift') && '[box-shadow:var(--elev-2),inset_0_0_0_1.5px_var(--accent)]')}>
      <div className="hidden w-[68px] shrink-0 flex-col items-center overflow-hidden rounded-[16px] bg-surface text-center [box-shadow:0_6px_16px_-10px_rgba(17,21,43,0.3),inset_0_0_0_1px_var(--line)] sm:flex">
        <span className="w-full bg-accent py-1 text-[10.5px] font-bold uppercase tracking-wider text-accent-fg">{formatDate(s.start, 'MMM')}</span>
        <span className="pt-1.5 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-text [font-family:var(--font-display)]">{formatDate(s.start, 'd')}</span>
        <span className="pb-2 pt-0.5 text-[11px] text-faint">{formatDate(s.start, 'EEE')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/v/opportunities/${s.event.id}`} className="type-title min-w-0 text-[16px] text-text wrap-anywhere hover:text-accent-text">
            {s.event.title}
          </Link>
          <AssignmentBadge status={s.assignment.status} size="sm" />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-faint" /> {formatDay(s.start)} · {formatTimeRange(s.shift.start_time, s.shift.end_time)}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-faint" /> <span className="truncate">{s.event.location}</span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canCheckIn ? (
          <Button asChild className="w-full sm:w-auto">
            <Link to={`/v/check-in/${s.shift.id}`}>
              <QrCode /> {t('Check in')}
            </Link>
          </Button>
        ) : phase === 'on-shift' ? (
          <>
            <Badge tone="success" dot pulse>
              {t('Checked in {time}', { time: formatTime(s.attendance!.check_in_time) })}
            </Badge>
            <Button asChild size="sm" variant="secondary">
              <Link to={`/v/check-in/${s.shift.id}`}>
                <LogOut /> {t('Check out')}
              </Link>
            </Button>
          </>
        ) : phase === 'missed' ? (
          <span className="text-[12.5px] text-warning-text">{t('Check-in closed — the coordinator can check you in')}</span>
        ) : s.assignment.status === 'waitlisted' ? (
          <>
            {s.assignment.waitlist_position != null && (
              <Badge tone="info" size="sm">
                {t('#{n} in line', { n: s.assignment.waitlist_position })}
              </Badge>
            )}
            <Button variant="ghost" size="sm" loading={withdraw.isPending} onClick={() => withdraw.mutate(s.assignment.id, { onSuccess: () => notify.success(t('You left the waitlist')) })}>
              <Undo2 /> {t('Leave waitlist')}
            </Button>
          </>
        ) : s.assignment.status === 'pending' ? (
          <Button variant="ghost" size="sm" loading={withdraw.isPending} onClick={() => withdraw.mutate(s.assignment.id, { onSuccess: () => notify.success(t('Application withdrawn')) })}>
            <Undo2 /> {t('Withdraw')}
          </Button>
        ) : phase === 'too-early' ? (
          <span className="text-[12.5px] text-faint">{t('Check-in opens {when}', { when: `${formatDay(opensAt).toLowerCase()} ${formatTime(opensAt)}` })}</span>
        ) : null}
      </div>
    </Card>
  );
}

export default function SchedulePage() {
  const { upcoming, past, isLoading, error, refetch } = useMyShifts();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const t = useT();
  useEffect(() => {
    document.title = `${t('My schedule')} · VolunTrack`;
  }, [t]);

  const totals = useMemo(() => {
    const done = past.filter((p) => p.attendance?.check_out_time);
    return {
      shifts: done.length,
      hours: done.reduce((n, p) => n + (['verified', 'adjusted'].includes(p.attendance?.hours_status ?? '') ? (p.attendance?.verified_hours ?? 0) : 0), 0),
      pending: done.filter((p) => p.attendance?.hours_status === 'pending').reduce((n, p) => n + (p.attendance?.hours ?? 0), 0),
    };
  }, [past]);
  const counts = useMemo(
    () => ({
      confirmed: upcoming.filter((u) => u.assignment.status === 'confirmed').length,
      pending: upcoming.filter((u) => u.assignment.status === 'pending').length,
      waitlisted: upcoming.filter((u) => u.assignment.status === 'waitlisted').length,
    }),
    [upcoming],
  );

  return (
    <>
      <PageHeader
        eyebrow={t('My schedule')}
        title={t('Shifts & attendance')}
        description={t('Everything you’ve applied for, been confirmed on, and attended.')}
        actions={
          <Button asChild variant="secondary">
            <Link to="/v/opportunities">
              <History /> {t('Browse opportunities')}
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile hue="indigo" icon={<CheckCircle2 />} label={t('Confirmed')} value={isLoading ? undefined : counts.confirmed} hint={t('places held for you')} />
        <StatTile hue="amber" icon={<Clock />} label={t('Awaiting review')} value={isLoading ? undefined : counts.pending} hint={t('a coordinator will decide')} />
        <StatTile hue="sky" icon={<Undo2 />} label={t('On waitlist')} value={isLoading ? undefined : counts.waitlisted} hint={t('first in line gets the place')} />
        <StatTile hue="emerald" icon={<History />} label={t('Verified hours')} value={isLoading ? undefined : totals.hours} decimals={totals.hours % 1 ? 1 : 0} suffix="h" hint={t('{n} shifts attended', { n: totals.shifts })} />
      </div>

      <Card className="mb-5 space-y-4 p-4 sm:p-5">
        <DistributionBar
          segments={[
            { value: counts.confirmed, hue: 'indigo', label: t('Confirmed') },
            { value: counts.pending, hue: 'amber', label: t('Awaiting review') },
            { value: counts.waitlisted, hue: 'sky', label: t('On waitlist') },
            { value: past.length, hue: 'emerald', label: t('History') },
          ]}
        />
        <FilterChips
          value={tab}
          onChange={setTab}
          aria-label={t('View')}
          options={[
            { value: 'upcoming', label: t('Upcoming'), count: upcoming.length },
            { value: 'history', label: t('History'), count: past.length, hue: 'emerald' },
          ]}
        />
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 />}
            title={t('Nothing scheduled')}
            description={t('Apply for a shift — it appears here while it’s under review and once you’re confirmed.')}
            action={
              <Button asChild>
                <Link to="/v/opportunities">{t('Browse opportunities')}</Link>
              </Button>
            }
          />
        ) : (
          <Stagger className="space-y-3">
            {upcoming.map((s) => (
              <StaggerItem key={s.assignment.id}>
                <UpcomingRow s={s} />
              </StaggerItem>
            ))}
          </Stagger>
        )
      ) : (
        <>
          {totals.pending > 0 && <p className="mb-3 text-[13px] text-muted">{t('+{h} awaiting review', { h: formatHours(totals.pending) })}</p>}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-left">
                <tr className="text-[11.5px] uppercase tracking-wider text-faint">
                  <th className="px-5 py-3 font-medium">{t('Shift')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('Check-in')}</th>
                  <th className="px-5 py-3 font-medium">{t('Hours')}</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">{t('Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {past.map((p) => {
                  const a = p.attendance;
                  const hrs = a?.check_out_time ? durationHours(a.check_in_time, a.check_out_time) : 0;
                  const status = a?.hours_status ? HOURS_STATUS[a.hours_status] : null;
                  return (
                    <tr key={p.assignment.id} className="transition-colors hover:bg-surface-2/50">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-text wrap-anywhere">{p.event.title}</div>
                        <div className="text-[12.5px] text-faint">{formatDate(p.start, 'EEE d MMM yyyy')}</div>
                        <div className="mt-1 md:hidden">{status ? <Badge tone={status.tone} size="sm">{t(status.label)}</Badge> : <AssignmentBadge status={p.assignment.status} size="sm" />}</div>
                        {a?.check_out_method === 'auto' && <div className="mt-1 text-[11.5px] text-faint">{t('Closed automatically at shift end')}</div>}
                        {a?.verification_note && <div className="mt-1 text-[11.5px] text-muted">{t('Coordinator:')} {a.verification_note}</div>}
                      </td>
                      <td className="hidden px-5 py-3.5 text-muted sm:table-cell">
                        {a ? (
                          <span className="inline-flex items-center gap-1.5">
                            {a.qr_verified ? <CheckCircle2 className="size-3.5 text-success" /> : <span className="text-[11px] text-warning-text">{t('manual')}</span>}
                            {formatTime(a.check_in_time)} – {formatTime(a.check_out_time)}
                          </span>
                        ) : (
                          <span className="text-faint">{t('Didn’t attend')}</span>
                        )}
                      </td>
                      <td className="type-data px-5 py-3.5 text-text">{a?.verified_hours != null ? formatHours(a.verified_hours) : hrs ? formatHours(hrs) : '—'}</td>
                      <td className="hidden px-5 py-3.5 md:table-cell">{status ? <Badge tone={status.tone} size="sm">{t(status.label)}</Badge> : <AssignmentBadge status={p.assignment.status} size="sm" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {past.length === 0 && <p className="p-8 text-center text-sm text-muted">{t('Your attended shifts will be listed here.')}</p>}
          </Card>
        </>
      )}
    </>
  );
}
