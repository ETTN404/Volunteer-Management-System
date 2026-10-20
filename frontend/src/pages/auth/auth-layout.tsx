import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Award, MapPin } from 'lucide-react';
import { DaisyOrnament, Logo } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { useT } from '@/shared/i18n';
import { LanguageToggle } from '@/app/layouts/language-toggle';

/** Split layout: form on the left, a forest brand panel with live-proof cards on the right. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const t = useT();
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" aria-label={t('VolunTrack home')}>
            <Logo />
          </Link>
          <LanguageToggle />
        </div>
        <motion.main
          id="main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12"
        >
          {children}
        </motion.main>
        <p className="text-xs text-faint">
          {t('Need help?')} <a className="text-muted underline-offset-4 hover:underline" href="mailto:support@voluntrack.org">support@voluntrack.org</a>
        </p>
      </div>
      <div className="relative hidden p-3 lg:block">
        <div className="relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[32px] bg-[#07130f] p-12">
          <div className="absolute -left-32 -top-32 -z-10 size-[520px] rounded-full bg-[#3341b8]/60 blur-[130px]" aria-hidden />
          <div className="absolute -bottom-40 right-0 -z-10 size-[420px] rounded-full bg-[#ef6a4c]/20 blur-[130px]" aria-hidden />
          <DaisyOrnament tone="dark" className="absolute -right-40 -top-24 -z-10 w-[760px] opacity-90" />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: EASE_OUT_EXPO }} className="absolute left-12 top-28 flex items-center gap-3 rounded-2xl bg-white/[0.07] py-2.5 pl-2.5 pr-4 backdrop-blur [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#8b97ff]/15 text-[#a9b2ff]">
              <MapPin className="size-[18px]" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-white">{t('Check-in verified')}</span>
              <span className="block text-[11.5px] text-white/65">{t('32 m from the venue · QR current')}</span>
            </span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: EASE_OUT_EXPO }} className="absolute right-12 top-56 flex items-center gap-3 rounded-2xl bg-white/[0.07] py-2.5 pl-2.5 pr-4 backdrop-blur [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#f5b955]/15 text-[#f5b955]">
              <Award className="size-[18px]" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-white">{t('50-hour certificate')}</span>
              <span className="block text-[11.5px] text-white/65">{t('Issued automatically')}</span>
            </span>
          </motion.div>
          {aside}
        </div>
      </div>
    </div>
  );
}

export function AuthQuote() {
  const t = useT();
  return (
    <div className="max-w-md">
      <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#a9b2ff]">{t('How hours are counted')}</p>
      <p className="text-[clamp(1.6rem,2.4vw,2.2rem)] font-bold leading-[1.15] tracking-[-0.035em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
        {t('A check-in only counts from inside the venue’s geofence — with a current QR code and a clock that matches the server.')}
      </p>
    </div>
  );
}
