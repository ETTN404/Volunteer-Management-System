import { motion, useScroll, useTransform } from 'motion/react';
import { Award, Bell, Bot, CalendarCheck, Check, MapPin, QrCode } from 'lucide-react';
import { useRef } from 'react';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { ProgressRing } from '@/shared/ui';
import { Reveal, Stagger, StaggerItem } from '@/shared/motion';
import { SectionHead, Shell } from './kit';

function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative w-[290px] rounded-[48px] bg-[#11152b] p-2.5 shadow-[0_50px_100px_-30px_rgba(17,21,43,0.55)] ${className ?? ''}`}>
      <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="overflow-hidden rounded-[40px] bg-bg">{children}</div>
    </div>
  );
}

const FEATURES = [
  [CalendarCheck, 'Shifts that fit', 'Opportunities ranked by how well they match each volunteer’s skills and availability.'],
  [QrCode, 'Check in in seconds', 'Stand at the venue, scan the coordinator’s code, done. No paper, no queues.'],
  [Award, 'Proof that travels', 'Certificates with a public link employers and universities can verify.'],
  [Bot, 'Help in Amharic', 'VolunBot answers from their own schedule and hours, in the language they write in.'],
] as const;

export function Volunteers() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [120, -20]);

  return (
    <Shell id="volunteers" className="overflow-hidden bg-surface">
      <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <SectionHead
            eyebrow="For volunteers"
            title={
              <>
                Their whole volunteering life,
                <br />
                <span className="text-sunrise">in their pocket.</span>
              </>
            }
            body="A phone-first portal that shows the next shift, checks them in at the venue and keeps every hour and certificate they earn. Nothing to install."
          />
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2" gap={0.08}>
            {FEATURES.map(([Icon, title, body]) => (
              <StaggerItem key={title}>
                <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-text">
                  <Icon className="size-5" />
                </div>
                <h3 className="type-title text-[16.5px] text-text">{title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div ref={ref} className="relative mx-auto h-[640px] w-full max-w-[520px]">
          <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--gold-soft),transparent_65%)]" />
          {/* Back phone: certificate */}
          <motion.div style={{ y: y2 }} className="absolute right-0 top-10 rotate-[8deg] max-sm:hidden">
            <Phone>
              <div className="flex h-[560px] flex-col items-center justify-center gap-5 bg-[linear-gradient(180deg,var(--gold-soft),var(--bg))] p-6 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Certificate of service</div>
                <CertificateSeal hours={50} size={150} />
                <div className="type-title text-xl text-text">Hana Tesfaye</div>
                <div className="text-[12.5px] text-muted">50 verified hours · Addis Relief</div>
                <div className="rounded-full bg-surface px-3 py-1.5 font-mono text-[10.5px] text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">voluntrack.org/verify/VMS-00041</div>
              </div>
            </Phone>
          </motion.div>
          {/* Front phone: home */}
          <motion.div style={{ y: y1 }} className="absolute left-0 top-0 -rotate-[4deg] max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:rotate-0">
            <Phone>
              <div className="h-[600px] p-5 pt-12">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-muted">Saturday, 17 Oct</div>
                    <div className="text-[19px] font-bold tracking-[-0.03em] text-text" style={{ fontFamily: 'var(--font-display)' }}>
                      Selam, Hana
                    </div>
                  </div>
                  <span className="relative grid size-9 place-items-center rounded-full bg-surface [box-shadow:inset_0_0_0_1px_var(--line)]">
                    <Bell className="size-4 text-muted" />
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-coral" />
                  </span>
                </div>
                <div className="mt-5 rounded-3xl bg-accent p-4 text-accent-fg">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] opacity-80">Check-in is open</div>
                  <div className="mt-1.5 text-[16px] font-bold leading-snug">Meskel Square Blood Drive</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11.5px] opacity-80">
                    <MapPin className="size-3" /> 32 m from the main tent
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="font-mono text-[18px] font-semibold tabular-nums">00:04:12</div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#11152b]">
                      <QrCode className="size-3.5" /> Check in
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 rounded-3xl bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)]">
                  <ProgressRing value={46.5} max={50} size={92} thickness={7} label="46.5 of 50 hours">
                    <span className="text-[17px] font-bold text-text">46.5</span>
                  </ProgressRing>
                  <div>
                    <div className="text-[13px] font-semibold text-text">3.5 h to go</div>
                    <div className="text-[11.5px] text-muted">until your 50-hour certificate</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ['Flood kit assembly', '100% match'],
                    ['First aid for drivers', '67% match'],
                  ].map(([t, m]) => (
                    <div key={t} className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 [box-shadow:inset_0_0_0_1px_var(--line)]">
                      <span className="text-[12.5px] font-medium text-text">{t}</span>
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-semibold text-success-text">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Phone>
          </motion.div>
          <Reveal inView delay={0.4} className="absolute -bottom-2 left-6 z-10 flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] max-sm:hidden">
            <span className="grid size-8 place-items-center rounded-full bg-success text-white">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <span className="text-[13px] font-semibold text-text">Checked in · 07:52</span>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}
