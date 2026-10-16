import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button, DaisyOrnament } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { ProductFrame } from './product-frame';

const words = (line: string) => line.split(' ');

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pb-24 pt-36 sm:pt-40" aria-labelledby="hero-title">
      {/* Atmosphere: grid, color fields, daisy */}
      <div className="bg-grid absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" aria-hidden />
      <div className="absolute -left-40 top-10 -z-10 size-[620px] rounded-full bg-accent/10 blur-[120px]" aria-hidden />
      <div className="absolute -right-32 top-40 -z-10 size-[520px] rounded-full bg-gold/15 blur-[120px]" aria-hidden />
      <div className="absolute right-1/4 top-[420px] -z-10 size-[360px] rounded-full bg-coral/10 blur-[110px]" aria-hidden />
      <DaisyOrnament className="absolute left-1/2 top-[520px] -z-10 w-[1100px] -translate-x-1/2 opacity-70" />

      <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-8">
        <motion.a
          href="#volunbot"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="group mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full bg-surface py-1 pl-1 pr-3.5 text-[13px] text-muted transition-colors [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)] hover:text-text"
        >
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-fg">New</span>
          VolunBot now answers in Amharic
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <h1 id="hero-title" className="type-display mx-auto max-w-[15ch] text-[clamp(2.9rem,8.4vw,6.6rem)]">
          <span className="block">
            {words('Every shift filled.').map((word, i) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="inline-block text-text"
                  initial={reduce ? { opacity: 0 } : { y: '110%', rotate: 4 }}
                  animate={reduce ? { opacity: 1 } : { y: '0%', rotate: 0 }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: EASE_OUT_EXPO }}
                >
                  {word}
                </motion.span>
                {i < 2 && ' '}
              </span>
            ))}
          </span>
          <span className="block overflow-hidden pb-[0.1em]">
            <motion.span
              className="text-sunrise inline-block pr-[0.04em]"
              initial={reduce ? { opacity: 0 } : { y: '110%' }}
              animate={reduce ? { opacity: 1 } : { y: '0%' }}
              transition={{ duration: 1.1, delay: 0.38, ease: EASE_OUT_EXPO }}
            >
              Every hour proven.
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE_OUT_EXPO }}
          className="mx-auto mt-7 max-w-[620px] text-[17px] leading-relaxed text-muted sm:text-[19px]"
        >
          VolunTrack matches volunteers to shifts by skill, checks them in at the venue with GPS and QR, verifies their hours and issues certificates anyone can
          check — every NGO in its own secure workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: EASE_OUT_EXPO }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="xl">
            <Link to="/register">
              Join as a volunteer <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="xl" variant="secondary">
            <a href="mailto:partners@voluntrack.org?subject=Bring%20VolunTrack%20to%20our%20organization">Bring it to your NGO</a>
          </Button>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} className="mt-5 text-[13px] text-faint">
          Free to start · Works on any phone · Nothing to install ·{' '}
          <Link to="/login" className="font-semibold text-text hover:underline">
            Sign in
          </Link>
        </motion.p>

        <ProductFrame />
      </div>
    </section>
  );
}
