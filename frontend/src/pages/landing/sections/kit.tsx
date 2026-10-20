import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Reveal } from '@/shared/motion';

/** Section heading used across the landing page. */
export function SectionHead({ eyebrow, title, body, align = 'left', tone = 'default', className }: { eyebrow: string; title: ReactNode; body?: ReactNode; align?: 'left' | 'center'; tone?: 'default' | 'dark'; className?: string }) {
  return (
    <Reveal inView className={cn('max-w-[720px]', align === 'center' && 'mx-auto text-center', className)}>
      <p className={cn('mb-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em]', tone === 'dark' ? 'text-[#a9b2ff]' : 'text-accent-text')}>
        <span className="size-1.5 rotate-45 bg-gold" /> {eyebrow}
      </p>
      <h2 className={cn('type-display text-[clamp(2.3rem,5vw,4.1rem)]', tone === 'dark' ? 'text-white' : 'text-text')}>{title}</h2>
      {body && <p className={cn('mt-6 text-[17px] leading-relaxed sm:text-[18px]', tone === 'dark' ? 'text-white/65' : 'text-muted', align === 'center' && 'mx-auto max-w-[600px]')}>{body}</p>}
    </Reveal>
  );
}

export function Shell({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('relative scroll-mt-24 py-28 sm:py-36', className)}>
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">{children}</div>
    </section>
  );
}
