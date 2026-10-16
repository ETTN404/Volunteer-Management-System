import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import type { AssignmentStatus, EventStatus } from '@/shared/types/api';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium leading-none [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-muted shadow-[inset_0_0_0_1px_var(--line)]',
        accent: 'bg-accent-soft text-accent-text',
        success: 'bg-success-soft text-success-text',
        danger: 'bg-danger-soft text-danger-text',
        warning: 'bg-warning-soft text-warning-text',
        info: 'bg-info-soft text-info-text',
        solid: 'bg-text text-bg',
      },
      size: {
        sm: 'h-5 px-2 text-[11px]',
        md: 'h-6 px-2.5 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ className, tone, size, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className="absolute inset-0 animate-ping-ring rounded-full bg-current" />}
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

const ASSIGNMENT: Record<AssignmentStatus, { tone: BadgeProps['tone']; label: string }> = {
  pending: { tone: 'warning', label: 'Awaiting review' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'neutral', label: 'Not selected' },
};

const EVENT: Record<EventStatus, { tone: BadgeProps['tone']; label: string; pulse?: boolean }> = {
  upcoming: { tone: 'info', label: 'Upcoming' },
  ongoing: { tone: 'success', label: 'Live', pulse: true },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
};

export function AssignmentBadge({ status, size }: { status: AssignmentStatus; size?: 'sm' | 'md' }) {
  const s = ASSIGNMENT[status];
  return (
    <Badge tone={s.tone} size={size} dot>
      {s.label}
    </Badge>
  );
}

export function EventStatusBadge({ status, size }: { status: EventStatus; size?: 'sm' | 'md' }) {
  const s = EVENT[status] ?? EVENT.upcoming;
  return (
    <Badge tone={s.tone} size={size} dot pulse={s.pulse}>
      {s.label}
    </Badge>
  );
}
