import { motion } from 'motion/react';
import { Award, Bell, Bot, CalendarRange, Check, ClipboardCheck, FileCheck2, Fingerprint, Globe2, Languages, Megaphone, Palette, ScrollText, ShieldCheck, Siren, Sparkles, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { EASE_OUT_EXPO, Reveal } from '@/shared/motion';
import { SectionHead, Shell } from './kit';

const MARQUEE = ['Shift scheduling', 'Skill matching', 'GPS check-in', 'Rotating QR codes', 'Hours verification', 'Certificates', 'Impact reports', 'VolunBot', 'Audit trail', 'Urgent alerts'];

export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/60 py-6 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]" aria-hidden>
      <div className="flex w-max animate-[marquee_42s_linear_infinite] gap-10 motion-reduce:animate-none">
        {[...MARQUEE, ...MARQUEE].map((m, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.035em] text-text/80" style={{ fontFamily: 'var(--font-display)' }}>
            {m}
            <span className="size-2 rotate-45 bg-gold" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Tile({ children, title, body, className, visualClassName }: { children: ReactNode; title: string; body: string; className?: string; visualClassName?: string }) {
  return (
    <Reveal inView className={cn('group flex flex-col overflow-hidden rounded-[28px] bg-surface [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)] transition-shadow duration-500 hover:[box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line-strong)]', className)}>
      <div className={cn('relative flex-1 overflow-hidden bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-6', visualClassName)}>{children}</div>
      <div className="border-t border-line px-7 py-6">
        <h3 className="type-title text-[19px] text-text">{title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </Reveal>
  );
}

const COLS = [
  { title: 'Applied', tone: 'bg-gold', people: [['Liya Tesfaye', 92], ['Abel Girma', 67]] },
  { title: 'Reviewing', tone: 'bg-info', people: [['Sara Mekonnen', 100]] },
  { title: 'Confirmed', tone: 'bg-success', people: [['Hana Tesfaye', 100], ['Dawit Bekele', 83], ['Ruth Abebe', 75]] },
] as const;

function Kanban() {
  return (
    <div className="-mx-6 flex h-full snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {COLS.map((c, ci) => (
        <div key={c.title} className="flex w-[72%] shrink-0 snap-start flex-col gap-2 rounded-[16px] bg-surface p-3 [box-shadow:inset_0_0_0_1px_var(--line)] sm:w-auto">
          <div className="mb-1 flex items-center gap-2 px-1 text-[11.5px] font-semibold text-muted">
            <span className={cn('size-2 rounded-full', c.tone)} /> {c.title}
            <span className="ml-auto text-faint">{c.people.length}</span>
          </div>
          {c.people.map(([n, m], i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + ci * 0.12 + i * 0.08, duration: 0.6, ease: EASE_OUT_EXPO }}
              className="flex items-center gap-2 rounded-[12px] bg-surface-2 p-2 [box-shadow:inset_0_0_0_1px_var(--line)]"
            >
              <Avatar name={n} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11.5px] font-semibold text-text">{n}</div>
                <div className="truncate text-[10.5px] text-faint">{m}% skill match</div>
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Geofence() {
  return (
    <div className="relative grid h-full min-h-[230px] place-items-center">
      <div className="bg-contours absolute inset-0 opacity-70" />
      <div className="relative grid size-48 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-accent/40 motion-safe:animate-[spin_30s_linear_infinite]" />
        <span className="absolute inset-0 rounded-full bg-accent/[0.06]" />
        <span className="absolute inset-10 rounded-full border border-accent/25" />
        <span className="size-3 rounded-full bg-accent shadow-[0_0_0_6px_var(--accent-soft)]" />
        {[
          [-48, -30, 'in'],
          [34, -54, 'in'],
          [44, 30, 'in'],
          [-30, 52, 'in'],
          [118, -84, 'out'],
        ].map(([x, y, s], i) => (
          <motion.span
            key={i}
            className={cn('absolute size-2.5 rounded-full', s === 'in' ? 'bg-success' : 'bg-danger')}
            style={{ x: x as number, y: y as number }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 300 }}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 rounded-xl bg-surface px-3 py-2 text-[11.5px] [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
        <span className="font-semibold text-success-text">Inside · 32 m</span> <span className="text-faint">limit 150 m</span>
      </div>
      <div className="absolute right-0 top-0 rounded-xl bg-surface px-3 py-2 text-[11.5px] [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
        <span className="font-semibold text-danger-text">Blocked · 214 m</span>
      </div>
    </div>
  );
}

function Hours() {
  return (
    <div className="grid h-full gap-4 sm:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-center">
        <div className="text-[13px] font-medium text-muted">Verified this quarter</div>
        <div className="mt-1 flex items-baseline gap-1 text-[56px] font-extrabold leading-none tracking-[-0.05em] text-text" style={{ fontFamily: 'var(--font-display)' }}>
          1,183<span className="text-xl text-faint">h</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <motion.div className="bg-sunrise h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: '84%' }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE_OUT_EXPO }} />
        </div>
        <div className="mt-2 text-[12px] text-faint">84% of logged hours signed off</div>
      </div>
      <ul className="space-y-2">
        {[
          ['Hana T.', '4.2 h', 'Verified'],
          ['Dawit B.', '3.75 h', 'Adjusted'],
          ['Meron A.', '5.0 h', 'Verified'],
        ].map(([n = '', h, s]) => (
          <li key={n} className="flex items-center gap-3 rounded-xl bg-surface p-2.5 [box-shadow:inset_0_0_0_1px_var(--line)]">
            <Avatar name={n} size="xs" />
            <span className="flex-1 text-[12.5px] font-medium text-text">{n}</span>
            <span className="text-[12px] tabular-nums text-muted">{h}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-semibold', s === 'Verified' ? 'bg-success-soft text-success-text' : 'bg-info-soft text-info-text')}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Calendar() {
  const cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const plan: Record<string, [string, string][]> = {
    Mon: [['Escort', 'bg-success-soft text-success-text']],
    Tue: [['Kits', 'bg-gold-soft text-warning-text']],
    Wed: [['Kits', 'bg-gold-soft text-warning-text'], ['Clinic', 'bg-info-soft text-info-text']],
    Thu: [['Blood', 'bg-coral-soft text-danger-text']],
    Fri: [['Reading', 'bg-success-soft text-success-text'], ['Blood', 'bg-coral-soft text-danger-text']],
  };
  return (
    <div className="grid h-full gap-2 sm:grid-cols-5">
      {cells.map((d) => (
        <div key={d} className="flex items-center gap-1.5 rounded-[12px] bg-surface p-2 [box-shadow:inset_0_0_0_1px_var(--line)] sm:flex-col sm:items-stretch">
          <span className="w-10 shrink-0 text-[11px] font-semibold text-faint sm:w-auto sm:text-center sm:text-[10.5px]">{d}</span>
          {plan[d]!.map(([t, c], i) => (
            <span key={i} className={cn('rounded-[8px] px-2.5 py-1.5 text-center text-[11px] font-semibold sm:px-1.5 sm:py-2 sm:text-[10.5px]', c)}>
              {t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Broadcast() {
  return (
    <div className="relative h-full min-h-[200px]">
      {[
        ['Urgent: kit assembly needs 4 more', 'Matches first aid · logistics', 0],
        ['You’re confirmed for Saturday', 'Meskel Square · 08:00', 1],
        ['50-hour certificate issued', 'Download or share the link', 2],
      ].map(([t, s, i]) => (
        <motion.div
          key={t as string}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + (i as number) * 0.15, duration: 0.7, ease: EASE_OUT_EXPO }}
          className="absolute inset-x-0 flex items-center gap-3 rounded-2xl bg-surface p-3 [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]"
          style={{ top: (i as number) * 58, scale: 1 - (i as number) * 0.04, zIndex: 3 - (i as number) }}
        >
          <span className={cn('grid size-8 place-items-center rounded-xl', i === 0 ? 'bg-coral-soft text-danger-text' : i === 1 ? 'bg-success-soft text-success-text' : 'bg-gold-soft text-warning-text')}>
            {i === 0 ? <Siren className="size-4" /> : i === 1 ? <Bell className="size-4" /> : <Award className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-text">{t}</span>
            <span className="block truncate text-[11px] text-faint">{s}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const EXTRAS = [
  [FileCheck2, 'Document checks'],
  [ShieldCheck, 'Parental consent'],
  [ClipboardCheck, 'Skill verification'],
  [Megaphone, 'Announcements'],
  [ScrollText, 'Audit trail'],
  [Palette, 'Your brand colors'],
  [Globe2, 'Multi-organization'],
  [Fingerprint, 'Role permissions'],
  [Languages, 'Amharic & English'],
  [Users, 'Volunteer directory'],
  [Bot, 'VolunBot assistant'],
  [CalendarRange, 'Drag-to-reschedule'],
] as const;

export function Platform() {
  return (
    <Shell id="platform">
      <SectionHead
        eyebrow="Everything a volunteer programme runs on"
        title={
          <>
            One platform.
            <br />
            Every moving part.
          </>
        }
        body="From the first application to the last certificate. The tools coordinators reach for every day, built to work together so nothing is typed twice."
      />
      <div className="mt-16 grid gap-5 lg:grid-cols-3">
        <Tile className="lg:col-span-2" title="Applications, ranked by fit" body="Every applicant scored against the shift’s skills, with reliability and history beside them. Approve in one tap.">
          <Kanban />
        </Tile>
        <Tile title="Check-in at the venue" body="GPS inside the geofence plus a rotating QR code. Paper sign-in sheets, retired.">
          <Geofence />
        </Tile>
        <Tile title="A calendar that fills itself" body="See capacity at a glance. Drag a shift to reschedule it.">
          <Calendar />
        </Tile>
        <Tile className="lg:col-span-2" title="Hours a donor can trust" body="Logged hours wait for a coordinator to verify or adjust before they reach a report.">
          <Hours />
        </Tile>
        <Tile title="Urgent alerts that reach the right people" body="Only volunteers whose skills match the shift are notified.">
          <Broadcast />
        </Tile>
        <Tile title="Certificates with public proof" body="Issued automatically at 10, 25, 50, 100, 200 and 500 hours.">
          <div className="flex h-full items-center justify-center gap-5">
            <motion.div initial={{ rotate: -30, scale: 0.7, opacity: 0 }} whileInView={{ rotate: 0, scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
              <CertificateSeal hours={50} size={128} />
            </motion.div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-1.5 font-semibold text-success-text">
                <Check className="size-3.5" strokeWidth={3} /> Valid certificate
              </div>
              <div className="rounded-lg bg-surface px-2.5 py-1.5 font-mono text-[11px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">verify/VMS-00041</div>
            </div>
          </div>
        </Tile>
        <Tile title="VolunBot, in two languages" body="Answers from each volunteer’s real schedule and hours.">
          <div className="flex h-full flex-col justify-center gap-2">
            <span className="self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[12.5px] text-accent-fg">When is my next shift?</span>
            <span className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2 text-[12.5px] text-text [box-shadow:inset_0_0_0_1px_var(--line)]">Saturday 08:00 at Meskel Square. Check in from the main tent.</span>
            <span lang="am" className="font-ethiopic self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[12.5px] text-accent-fg">
              ስንት ሰዓት ይቀረኛል?
            </span>
          </div>
        </Tile>
      </div>

      <Reveal inView className="mt-5 flex flex-wrap items-center gap-2 rounded-[28px] bg-surface p-5 [box-shadow:inset_0_0_0_1px_var(--line)] sm:p-6">
        <span className="mr-2 flex items-center gap-2 text-[14px] font-semibold text-text">
          <Sparkles className="size-4 text-gold" /> And the rest:
        </span>
        {EXTRAS.map(([Icon, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
            <Icon className="size-3.5 text-accent-text" /> {label}
          </span>
        ))}
      </Reveal>
    </Shell>
  );
}
