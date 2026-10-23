import { Award, CalendarClock, LocateFixed, MapPin, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatDay, formatTime } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { AVAILABILITY_SLOTS } from '@/shared/lib/skills';
import { useT } from '@/shared/i18n';
import { Avatar } from '@/shared/ui';

/** "What VolunBot can see" — the live facts it answers from, beside the chat on wide screens. */
export function ContextPanel({
  name,
  photo,
  skills,
  availability,
  next,
  hours,
  score,
  nextMilestone,
  locationLabel,
  onLocation,
}: {
  name: string;
  photo?: string | null;
  skills: string[];
  availability: string[];
  next?: { shift?: { start_time: string; event?: { title: string } | null } | null };
  hours?: number;
  score?: number;
  nextMilestone?: number | null;
  locationLabel: string | null;
  onLocation: () => void;
}) {
  const t = useT();
  const progress = nextMilestone && hours != null ? Math.min(100, (hours / nextMilestone) * 100) : 100;

  return (
    <aside className="vb-scroll hidden w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface-2/40 p-5 xl:block" aria-label={t('What VolunBot can see')}>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <Sparkles className="size-4 text-accent-text" /> {t('What VolunBot can see')}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-faint">
        <RefreshCw className="size-3" /> {t('Refreshed with every message')}
      </p>

      <div className="mt-4 rounded-[18px] bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)]">
        <div className="flex items-center gap-3">
          <Avatar name={name} src={photo} size="md" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-text">{name}</div>
            <Link to="/v/profile" className="text-[12px] font-medium text-accent-text hover:underline">
              {t('Edit profile')}
            </Link>
          </div>
        </div>
        <Label>{t('Skills')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {skills.length ? (
            skills.slice(0, 8).map((s) => (
              <span key={s} className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent-text">
                {humanizeSkill(s)}
              </span>
            ))
          ) : (
            <span className="text-[12.5px] text-faint">{t('None added')}</span>
          )}
        </div>
        <Label>{t('Availability')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {availability.length ? (
            availability.map((a) => (
              <span key={a} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-muted">
                {t(AVAILABILITY_SLOTS.find((s) => s.key === a)?.label ?? humanizeSkill(a))}
              </span>
            ))
          ) : (
            <span className="text-[12.5px] text-faint">{t('Not set')}</span>
          )}
        </div>
      </div>

      <Fact hue="amber" icon={<CalendarClock />} label={t('Next shift')}>
        {next?.shift ? (
          <>
            <div className="truncate font-semibold text-text">{next.shift.event?.title}</div>
            <div className="text-[12px] text-muted">
              {formatDay(next.shift.start_time)} · {formatTime(next.shift.start_time)}
            </div>
          </>
        ) : (
          <div className="text-muted">{t('Nothing booked')}</div>
        )}
      </Fact>

      <Fact hue="emerald" icon={<Award />} label={t('Impact')}>
        <div className="flex items-baseline gap-3">
          <span className="type-data text-[18px] font-bold text-text">{hours != null ? `${Math.round(hours * 10) / 10} h` : '—'}</span>
          <span className="text-[12px] text-muted">{t('score {s}', { s: score ?? '—' })}</span>
        </div>
        {nextMilestone && (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[var(--hue-emerald)]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-[11.5px] text-faint">{t('{n}-hour milestone', { n: nextMilestone })}</div>
          </>
        )}
      </Fact>

      <Fact hue="sky" icon={locationLabel ? <LocateFixed /> : <MapPin />} label={t('Location')}>
        <div className="flex items-center justify-between gap-2">
          <span className={locationLabel ? 'truncate font-medium text-text' : 'text-muted'}>{locationLabel ?? t('Not shared')}</span>
          <button onClick={onLocation} className="shrink-0 text-[12px] font-semibold text-accent-text hover:underline">
            {locationLabel ? t('Change') : t('Share')}
          </button>
        </div>
      </Fact>

      <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        {t('VolunBot only answers about your volunteering. It never sees other volunteers’ details.')}
      </p>
    </aside>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 mt-4 text-[11.5px] font-semibold text-faint">{children}</div>;
}

function Fact({ icon, label, hue, children }: { icon: ReactNode; label: string; hue: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-[18px] bg-surface p-4 text-[13.5px] [box-shadow:inset_0_0_0_1px_var(--line)]">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-muted">
        <span className="grid size-6 place-items-center rounded-[8px] [&_svg]:size-3.5" style={{ background: `var(--hue-${hue}-soft)`, color: `var(--hue-${hue})` }}>
          {icon}
        </span>
        {label}
      </div>
      {children}
    </div>
  );
}
