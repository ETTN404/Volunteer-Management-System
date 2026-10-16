import { motion } from 'motion/react';
import { Building2, CalendarPlus, Check, QrCode } from 'lucide-react';
import { CapacityMeter } from '@/shared/ui';
import { EASE_OUT_EXPO, Reveal } from '@/shared/motion';
import { SectionHead, Shell } from './kit';

const STEPS = [
  {
    icon: Building2,
    title: 'Set up your organization',
    body: 'We create your secure workspace and first admin. Add your logo, colors and coordinators in an afternoon.',
    visual: (
      <div className="space-y-2.5">
        {[
          ['Organization', 'Addis Relief Network'],
          ['City', 'Addis Ababa'],
          ['Brand color', ''],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="mb-1 text-[10.5px] font-medium text-faint">{l}</div>
            <div className="flex h-9 items-center gap-2 rounded-xl bg-surface px-3 text-[12.5px] text-text [box-shadow:inset_0_0_0_1px_var(--line)]">
              {v || (
                <>
                  <span className="size-4 rounded-full bg-accent" />
                  <span className="size-4 rounded-full bg-coral" />
                  <span className="size-4 rounded-full bg-gold ring-2 ring-text ring-offset-1 ring-offset-surface" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: CalendarPlus,
    title: 'Post events and shifts',
    body: 'Pin the venue on the map, set the check-in radius, and add shifts with the skills each one needs.',
    visual: (
      <div className="space-y-2.5">
        {[
          ['Sat 08:00 – 12:00', 9, 12],
          ['Sat 13:00 – 17:00', 4, 10],
        ].map(([t, c, cap]) => (
          <div key={t as string} className="rounded-xl bg-surface p-3 [box-shadow:inset_0_0_0_1px_var(--line)]">
            <div className="mb-2 text-[12.5px] font-semibold text-text">{t}</div>
            <CapacityMeter confirmed={c as number} capacity={cap as number} />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: QrCode,
    title: 'Volunteers show up and check in',
    body: 'They scan the rotating code at the venue. Hours flow to coordinators to verify, then to reports and certificates.',
    visual: (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.3 }}
          className="grid size-16 place-items-center rounded-full bg-success text-white shadow-[0_0_0_10px_var(--success-soft)]"
        >
          <Check className="size-8" strokeWidth={3} />
        </motion.span>
        <span className="text-[13px] font-semibold text-text">Checked in · 07:52</span>
        <span className="text-[11.5px] text-faint">32 m from the venue · QR verified</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <Shell id="how" className="bg-surface">
      <SectionHead align="center" eyebrow="How it works" title="Up and running this week." body="Three steps from sign-up to the first verified hour." />
      <div className="relative mt-16 grid gap-5 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-[52px] hidden h-px bg-[linear-gradient(90deg,transparent,var(--line-strong)_15%,var(--line-strong)_85%,transparent)] md:block" aria-hidden />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} inView delay={i * 0.12} className="relative flex flex-col rounded-[28px] bg-bg p-6 [box-shadow:inset_0_0_0_1px_var(--line)]">
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center rounded-2xl bg-accent text-accent-fg shadow-[0_8px_20px_-8px_var(--accent)]">
                <s.icon className="size-5" />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">Step {i + 1}</span>
            </div>
            <h3 className="type-title mt-5 text-[20px] text-text">{s.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.body}</p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: EASE_OUT_EXPO }}
              className="mt-6 min-h-[176px] flex-1 rounded-2xl bg-surface-2 p-4 [box-shadow:inset_0_0_0_1px_var(--line)]"
            >
              {s.visual}
            </motion.div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}
