import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    '[&_svg]:size-[1.05em] [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(11,31,26,0.2),0_6px_16px_-6px_color-mix(in_oklab,var(--accent)_55%,transparent)] hover:brightness-[1.08] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_22px_-6px_color-mix(in_oklab,var(--accent)_60%,transparent)]',
        secondary: 'bg-surface text-text shadow-[inset_0_0_0_1px_var(--line-strong),0_1px_2px_rgba(11,31,26,0.05)] hover:bg-surface-2',
        outline: 'bg-transparent text-text shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2',
        ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
        danger: 'bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110',
        'danger-soft': 'bg-danger-soft text-danger-text hover:bg-danger/20',
        success: 'bg-success text-[#03241a] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-105',
        'success-soft': 'bg-success-soft text-success-text hover:bg-success/20',
        link: 'h-auto bg-transparent p-0 text-accent-text underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-7 rounded-full px-3 text-xs',
        sm: 'h-8 rounded-full px-3.5 text-[13px]',
        md: 'h-10 rounded-full px-4.5 text-sm',
        lg: 'h-12 rounded-full px-6 text-[15px]',
        xl: 'h-14 rounded-full px-8 text-base',
        icon: 'size-9 rounded-md',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-11 rounded-lg',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, type, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && (
              <span className="absolute inset-0 grid place-items-center">
                <Spinner className="size-4" />
              </span>
            )}
            <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
