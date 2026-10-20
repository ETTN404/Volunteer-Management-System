import { Accordion } from 'radix-ui';
import { ArrowRight, Check, ChevronDown, Fingerprint, LockKeyhole, ScrollText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { Button, DaisyOrnament, Logo } from '@/shared/ui';
import { CountUp, Reveal } from '@/shared/motion';
import { usePublicStats } from '@/features/public/api';
import { SectionHead, Shell } from './kit';

const TRUST = [
  [LockKeyhole, 'Every organization sealed off', 'Coordinators only ever see their own volunteers and events. Suspending a tenant ends all of its sessions at once.'],
  [Fingerprint, 'Check-in that resists shortcuts', 'Geofence, rotating QR signatures, server-time checks and rate limits. Overrides need a signature.'],
  [ShieldCheck, 'A role for every job', 'Volunteers, coordinators, organization admins and the platform team each see exactly what they need.'],
  [ScrollText, 'Every change recorded', 'Who changed what, when and from where — with before and after values, ready at audit time.'],
] as const;

export function Trust() {
  const stats = usePublicStats();
  const items = [
    ['Verified hours', stats.data?.verified_hours],
    ['Volunteers', stats.data?.volunteers],
    ['Certificates issued', stats.data?.certificates_issued],
    ['Organizations', stats.data?.organizations],
  ] as const;
  return (
    <section className="px-3 sm:px-5" aria-labelledby="trust">
      <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[40px] bg-[#07130f] px-5 py-28 sm:px-8 sm:py-36">
        <div className="absolute -left-40 -top-40 -z-10 size-[600px] rounded-full bg-[#3341b8]/50 blur-[140px]" aria-hidden />
        <DaisyOrnament tone="dark" className="absolute -right-56 top-1/2 -z-10 w-[860px] -translate-y-1/2 opacity-90" />
        <div className="mx-auto max-w-[1180px]">
          <SectionHead
            tone="dark"
            eyebrow="Built to be trusted"
            title={
              <span id="trust">
                Records kept
                <br />
                like they matter.
              </span>
            }
            body="Volunteer details, attendance and hours are the things an NGO must never lose or leak. They’re the things we guard first."
          />
          <div className="mt-16 grid overflow-hidden rounded-[28px] border border-white/10 bg-[#07130f]/80 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(([Icon, title, body], i) => (
              <Reveal key={title} inView delay={i * 0.08} className={cn('p-7', i > 0 && 'border-white/10 max-lg:border-t lg:border-l', i === 2 && 'sm:max-lg:border-l-0')}>
                <span className="mb-6 grid size-11 place-items-center rounded-2xl bg-white/[0.06] text-[#a9b2ff]">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-[17px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/60">{body}</p>
              </Reveal>
            ))}
          </div>
          {stats.data && (
            <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-white/10 pt-12 lg:grid-cols-4">
              {items.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[13px] font-medium text-white/65">{label}</dt>
                  <dd className="mt-2 text-[clamp(2.2rem,4vw,3.4rem)] font-extrabold leading-none tracking-[-0.05em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    {value != null ? <CountUp value={value} /> : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  { name: 'Free', tag: 'For one programme getting started', cta: 'Start free', features: ['Unlimited volunteers', 'Events, shifts and skill matching', 'GPS + QR check-in', 'Milestone certificates'] },
  { name: 'Pro', tag: 'For NGOs running several programmes', cta: 'Talk to us', featured: true, features: ['Everything in Free', 'Multiple coordinators', 'Hours verification & donor reports', 'Urgent shift alerts', 'VolunBot assistant'] },
  { name: 'Enterprise', tag: 'For national networks and federations', cta: 'Talk to us', features: ['Everything in Pro', 'Your brand and subdomain', 'Audit trail export', 'Dedicated onboarding'] },
];

export function Plans() {
  return (
    <Shell id="plans">
      <SectionHead align="center" eyebrow="Plans" title="Start with one programme. Grow into a network." />
      <div className="mt-16 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} inView delay={i * 0.08} className={cn('relative flex flex-col rounded-[28px] p-8', p.featured ? 'bg-[#11152b] text-white [box-shadow:var(--elev-3)]' : 'bg-surface [box-shadow:inset_0_0_0_1px_var(--line)]')}>
            {p.featured && <span className="absolute right-6 top-7 rounded-full bg-gold px-3 py-1 text-[11.5px] font-semibold text-[#11152b]">Most chosen</span>}
            <h3 className={cn('type-headline text-[32px]', p.featured ? 'text-white' : 'text-text')}>{p.name}</h3>
            <p className={cn('mt-2 text-[14.5px]', p.featured ? 'text-white/60' : 'text-muted')}>{p.tag}</p>
            <ul className="mt-8 flex-1 space-y-3.5">
              {p.features.map((f) => (
                <li key={f} className={cn('flex gap-3 text-[14.5px]', p.featured ? 'text-white/90' : 'text-text')}>
                  <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', p.featured ? 'bg-[#8b97ff] text-[#070a26]' : 'bg-accent-soft text-accent-text')}>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant={p.featured ? 'secondary' : 'primary'} className="mt-10">
              <a href={`mailto:partners@voluntrack.org?subject=${encodeURIComponent(p.name)}%20plan`}>{p.cta}</a>
            </Button>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

const FAQ: [string, string][] = [
  ['Do volunteers need to install an app?', 'No. VolunTrack runs in the phone’s browser. Volunteers open the link, allow location for check-in, and can add it to their home screen.'],
  ['What if a volunteer’s GPS fails at the venue?', 'The coordinator checks them in manually. A drawn signature is captured and the override is written to the audit trail.'],
  ['Can one NGO see another’s volunteers?', 'Never. Each organization is isolated. Coordinators and admins only see their own volunteers, events and reports.'],
  ['How are certificates verified?', 'Every certificate carries a number and QR code linking to a public page that confirms the hours, organization and issue date — with the surname shortened for privacy.'],
  ['Does VolunBot work in Amharic?', 'Yes. It answers in the language you write in, using your real schedule and hours.'],
  ['Who approves the hours in donor reports?', 'Coordinators. Logged hours stay pending until a coordinator verifies or adjusts them.'],
];

export function Faq() {
  return (
    <Shell id="faq" className="bg-surface">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <SectionHead eyebrow="Questions" title="What NGOs ask us first." body="Anything else? Write to partners@voluntrack.org — a person answers." />
        <Accordion.Root type="single" collapsible defaultValue={FAQ[0]![0]} className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left text-[17px] font-semibold text-text outline-none focus-visible:text-accent-text">
                  {q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 transition-transform duration-300 group-data-[state=open]:rotate-180">
                    <ChevronDown className="size-4 text-muted" />
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[fade-out_120ms] data-[state=open]:animate-[rise_300ms_var(--ease-out-expo)]">
                <p className="max-w-2xl pb-6 text-[15.5px] leading-relaxed text-muted">{a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </Shell>
  );
}

export function FinalCta() {
  return (
    <section className="px-3 py-3 sm:px-5 sm:py-5" aria-labelledby="cta-title">
      <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[40px] bg-[#07130f] px-6 py-28 text-center sm:py-36">
        <DaisyOrnament tone="dark" className="absolute left-1/2 top-1/2 -z-10 w-[980px] -translate-x-1/2 -translate-y-1/2 opacity-80" />
        <div className="absolute bottom-0 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#3341b8] blur-[140px]" aria-hidden />
        <h2 id="cta-title" className="type-display mx-auto max-w-[14ch] text-[clamp(2.6rem,6.6vw,5.4rem)] text-white">
          Bring your volunteers online <span className="bg-[linear-gradient(100deg,#a9b2ff,#f5b955)] bg-clip-text text-transparent">this season.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[17px] text-white/65">Shifts, check-in, hours and certificates — in one calm place your coordinators will actually use.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="xl" className="bg-white text-[#11152b] shadow-none hover:bg-white/90 hover:brightness-100">
            <Link to="/register">
              Join as a volunteer <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] hover:bg-white/10">
            <a href="mailto:partners@voluntrack.org?subject=Bring%20VolunTrack%20to%20our%20organization">Bring it to your NGO</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
      <div className="flex flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">Volunteer operations for NGOs — verified check-in, hours that count, certificates anyone can check.</p>
          <p lang="am" className="font-ethiopic mt-4 text-sm text-faint">
            ለበጎ ፈቃደኞች የተሰራ
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-[14.5px] sm:grid-cols-3">
          {[
            ['Product', [['Platform', '#platform'], ['For volunteers', '#volunteers'], ['Verified check-in', '#check-in'], ['Plans', '#plans']]],
            ['Use it', [['Join as a volunteer', '/register'], ['Sign in', '/login'], ['Verify a certificate', '/verify']]],
            ['Contact', [['partners@voluntrack.org', 'mailto:partners@voluntrack.org'], ['support@voluntrack.org', 'mailto:support@voluntrack.org']]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">{title as string}</div>
              <ul className="space-y-3">
                {(links as string[][]).map(([l, h]) => (
                  <li key={l}>
                    <a href={h} className="text-muted transition-colors hover:text-text">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-[13px] text-faint sm:flex-row">
        <span>© {new Date().getFullYear()} VolunTrack. Made in Addis Ababa.</span>
        <span>Built for NGOs, relief networks and student volunteer programmes.</span>
      </div>
    </footer>
  );
}
