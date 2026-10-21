import { ArrowRight, CalendarPlus, Clock, LogOut, MapPin, QrCode, Timer } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { countdownTo, formatDay, formatTimeRange } from '@/shared/lib/time';
import { useNow } from '@/shared/hooks/use-now';
import { Badge, Button, Card, EmptyState, VenueMap } from '@/shared/ui';
import { shiftPhase, type ScheduledShift } from '../derived';
import { useT } from '@/shared/i18n';

function Digits({ value, label }: { value: number; label: string }) {
  const t = useT();
  return (
    <div className="flex min-w-[2.6rem] flex-col items-center">
      <span className="type-data text-[clamp(1.6rem,7vw,2.6rem)] leading-none text-text tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="type-eyebrow mt-1.5 !text-[9.5px]">{t(label)}</span>
    </div>
  );
}

const hhmm = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Next confirmed shift — or the one you're on right now. The button always matches your real state. */
export function NextShiftCard({ next, className }: { next: ScheduledShift | undefined; className?: string }) {
  const now = useNow(1000);
  const t = useT();
  if (!next) {
    return (
      <Card className={cn('p-0', className)}>
        <EmptyState
          className="h-full shadow-none"
          icon={<CalendarPlus />}
          title={t('No confirmed shifts yet')}
          description={t('Apply for a shift that fits your skills — once a coordinator confirms you, it shows up here with a live countdown.')}
          action={
            <Button asChild>
              <Link to="/v/opportunities">
                {t('Find a shift')} <ArrowRight />
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const phase = shiftPhase(next, now);
  const onShift = phase === 'on-shift';
  const open = phase === 'check-in-open';
  const c = countdownTo(next.start, now);
  const opensAt = new Date(next.start.getTime() - 15 * 60_000);
  const closesAt = new Date(Math.min(next.start.getTime() + 30 * 60_000, next.end.getTime()));
  const checkedInAt = next.attendance?.check_in_time ? new Date(next.attendance.check_in_time) : null;
  const elapsedMin = checkedInAt ? Math.max(0, Math.floor((now.getTime() - checkedInAt.getTime()) / 60_000)) : 0;

  return (
    <Card className={cn('relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-7', (onShift || open) && '[box-shadow:0_24px_48px_-28px_color-mix(in_oklab,var(--accent)_60%,transparent),inset_0_0_0_1.5px_color-mix(in_oklab,var(--accent)_45%,transparent)]', className)}>
      <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full border border-dashed border-accent/40" aria-hidden />
      <div className="pointer-events-none absolute -top-4 -right-4 size-40 rounded-full border border-accent/20" aria-hidden />

      <div className="relative flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent-text">
          <span className="size-1.5 rounded-full bg-accent" />
          {onShift ? t('You’re on shift') : open ? t('Check-in is open') : t('Your next shift')}
        </span>
        {(onShift || open) && (
          <Badge tone="success" size="sm" dot pulse>
            {onShift ? t('Checked in') : t('Live now')}
          </Badge>
        )}
      </div>
      <h2 className="relative mt-4 max-w-lg text-[clamp(1.35rem,4vw,1.9rem)] font-extrabold leading-tight tracking-[-0.03em] text-text [font-family:var(--font-display)] wrap-anywhere">{next.event.title}</h2>
      <div className="relative mt-3 flex min-w-0 flex-col gap-1.5 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 shrink-0 text-faint" /> {formatDay(next.start)} · {formatTimeRange(next.shift.start_time, next.shift.end_time)}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-4 shrink-0 text-faint" /> <span className="truncate">{next.event.location}</span>
        </span>
      </div>

      <div className="relative mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        {onShift ? (
          <div className="flex items-end gap-3">
            <Timer className="mb-1 size-6 text-accent-text" />
            <div>
              <div className="type-data text-[clamp(1.6rem,7vw,2.4rem)] leading-none text-text tabular-nums">
                {Math.floor(elapsedMin / 60)}h {String(elapsedMin % 60).padStart(2, '0')}m
              </div>
              <div className="mt-1 text-xs text-muted">{t('since you checked in at {time} · ends {end}', { time: checkedInAt ? hhmm(checkedInAt) : '—', end: hhmm(next.end) })}</div>
            </div>
          </div>
        ) : phase === 'too-early' ? (
          <div className="flex items-end gap-3 sm:gap-6" aria-label={t('Starts in {d} days {h} hours {m} minutes', { d: c.days, h: c.hours, m: c.minutes })}>
            {c.days > 0 && <Digits value={c.days} label="days" />}
            <Digits value={c.hours} label="hours" />
            <Digits value={c.minutes} label="min" />
            <Digits value={c.seconds} label="sec" />
          </div>
        ) : (
          <p className="text-sm text-text">
            {now < next.start ? t('Starts at {time}', { time: hhmm(next.start) }) : t('Started {n} min ago', { n: Math.round((now.getTime() - next.start.getTime()) / 60_000) })}
            {open && ` · ${t('check-in closes at {time}', { time: hhmm(closesAt) })}`}
          </p>
        )}

        {onShift ? (
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link to={`/v/check-in/${next.shift.id}`}>
              <LogOut /> {t('Check out')}
            </Link>
          </Button>
        ) : open ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={`/v/check-in/${next.shift.id}`}>
              <QrCode /> {t('Check in now')}
            </Link>
          </Button>
        ) : phase === 'too-early' ? (
          <p className="text-[13px] text-muted">{t('Check-in opens at {time}', { time: hhmm(opensAt) })}</p>
        ) : phase === 'missed' ? (
          <p className="text-[13px] text-warning-text">{t('Check-in closed. If you are at the venue, find the coordinator — they can check you in.')}</p>
        ) : (
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link to="/v/schedule">{t('View schedule')}</Link>
          </Button>
        )}
      </div>

      {next.event.coordinates.latitude != null && next.event.coordinates.longitude != null && (
        <VenueMap
          venue={{ latitude: next.event.coordinates.latitude, longitude: next.event.coordinates.longitude }}
          radius={next.event.geofence_radius}
          label={next.event.location.split(',')[0]}
          className="relative mt-6 min-h-44 flex-1 overflow-hidden rounded-[18px]"
        />
      )}
      <ul className="relative mt-5 flex flex-wrap gap-2 text-[12.5px] text-muted">
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <MapPin className="size-3.5 text-accent-text" /> {t('Within {n} m of the venue', { n: next.event.geofence_radius })}
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <QrCode className="size-3.5 text-accent-text" /> {t('Scan the coordinator’s QR')}
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <Clock className="size-3.5 text-accent-text" /> {t('Opens 15 min before start')}
        </li>
      </ul>
    </Card>
  );
}
