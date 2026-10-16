import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'default' | 'sunken' | 'raised' | 'accent';

const tones: Record<Tone, string> = {
  default: 'bg-surface [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]',
  sunken: 'bg-sunken [box-shadow:inset_0_0_0_1px_var(--line)]',
  raised: 'bg-raised [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]',
  accent: 'bg-accent-soft [box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)]',
};

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { tone?: Tone; interactive?: boolean }>(
  ({ className, tone = 'default', interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-lg',
        tones[tone],
        interactive && 'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:[box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line-strong)]',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export function CardHeader({
  title,
  eyebrow,
  description,
  action,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="type-eyebrow mb-1.5">{eyebrow}</div>}
        <h3 className="type-title text-[17px] text-text">{title}</h3>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 border-t border-line px-5 py-3.5', className)} {...props} />;
}
