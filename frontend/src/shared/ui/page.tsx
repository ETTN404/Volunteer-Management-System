import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Reveal } from '@/shared/motion';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Reveal as="header" className={cn('mb-7 flex flex-col gap-5 md:mb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {/* A plain-text eyebrow repeats the top bar title, so only rich eyebrows (badges, dates) are shown. */}
        {eyebrow && typeof eyebrow !== 'string' && <div className="mb-3 flex flex-wrap items-center gap-2">{eyebrow}</div>}
        <h1 className="text-[28px] font-extrabold leading-[1.08] tracking-[-0.035em] text-text [font-family:var(--font-display)] sm:text-[36px]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </Reveal>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title && <h2 className="type-title text-lg text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('type-data inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 text-[10.5px] text-muted', className)}>
      {children}
    </kbd>
  );
}

/** Small key/value row used in detail panels. */
export function KeyValue({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm [&+&]:border-t [&+&]:border-line">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right text-text', mono && 'type-data')}>{children}</dd>
    </div>
  );
}
