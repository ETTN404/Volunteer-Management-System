import { ArrowRight, CalendarPlus, Clock, MapPin, QrCode } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { checkInWindow, countdownTo, formatDay, formatTimeRange } from '@/shared/lib/time';
import { useNow } from '@/shared/hooks/use-now';
import { Badge, Button, Card, EmptyState } from '@/shared/ui';
import type { ScheduledShift } from '../derived';

function Digits({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="type-data text-[clamp(1.8rem,4vw,2.6rem)] leading-none text-text tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="type-eyebrow mt-1.5 !text-[9.5px]">{label}</span>
    </div>
  );
}

export function NextShiftCard({ next, className }: { next: ScheduledShift | undefined; className?: string }) {
  const now = useNow(1000);
  if (!next) {
    return (
      <Card className={cn('p-0', className)}>
        <EmptyState
          className="h-full shadow-none"
          icon={<CalendarPlus />}
          title="No confirmed shifts yet"
          description="Apply for a shift that fits your skills — once a coordinator confirms you, it shows up here with a live countdown."
          action={
            <Button asChild>
              <Link to="/v/opportunities">
                Find a shift <ArrowRight />
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const window = checkInWindow(next.shift.start_time, now);
  const c = countdownTo(next.start, now);
  const live = window?.state === 'open';
  const started = now >= next.start;

  return (
    <Card tone={live ? 'accent' : 'default'} className={cn('relative overflow-hidden p-6 sm:p-7', className)}>
      {/* Geofence motif */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-dashed border-accent/40" aria-hidden />
      <div className="pointer-events-none absolute -right-4 -top-4 size-40 rounded-full border border-accent/20" aria-hidden />

      <div className="relative flex flex-wrap items-center gap-2">
        <span className="type-eyebrow">{live ? 'Check-in is open' : 'Your next shift'}</span>
        {live && (
          <Badge tone="success" size="sm" dot pulse>
            Live now
          </Badge>
        )}
      </div>
      <h2 className="type-title relative mt-3 max-w-lg text-[clamp(1.35rem,2.4vw,1.75rem)] text-text">{next.event.title}</h2>
      <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 text-faint" /> {formatDay(next.start)} · {formatTimeRange(next.shift.start_time, next.shift.end_time)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 text-faint" /> {next.event.location}
        </span>
      </div>

      <div className="relative mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        {!started ? (
          <div className="flex items-end gap-4 sm:gap-6" aria-label={`Starts in ${c.days} days ${c.hours} hours ${c.minutes} minutes`}>
            {c.days > 0 && <Digits value={c.days} label="days" />}
            <Digits value={c.hours} label="hours" />
            <Digits value={c.minutes} label="min" />
            <Digits value={c.seconds} label="sec" />
          </div>
        ) : (
          <p className="text-sm text-text">
            Started {Math.round((now.getTime() - next.start.getTime()) / 60_000)} min ago
            {window?.state === 'open' && ` · check-in closes at ${window.closesAt.toTimeString().slice(0, 5)}`}
          </p>
        )}
        {live ? (
          <Button asChild size="lg">
            <Link to={`/v/check-in/${next.shift.id}`}>
              <QrCode /> Check in now
            </Link>
          </Button>
        ) : window?.state === 'early' ? (
          <p className="text-[13px] text-muted">Check-in opens at {window.opensAt.toTimeString().slice(0, 5)}</p>
        ) : (
          <Button asChild variant="secondary">
            <Link to="/v/schedule">View schedule</Link>
          </Button>
        )}
      </div>

      <ul className="relative mt-7 flex flex-wrap gap-2 border-t border-line pt-5 text-[12.5px] text-muted">
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <MapPin className="size-3.5 text-accent-text" /> Within {next.event.geofence_radius} m of the venue
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <QrCode className="size-3.5 text-accent-text" /> Scan your coordinator’s QR
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5">
          <Clock className="size-3.5 text-accent-text" /> Opens 15 min before start
        </li>
      </ul>
    </Card>
  );
}
