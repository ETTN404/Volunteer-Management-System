import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const base =
  'w-full rounded-[12px] bg-sunken text-text placeholder:text-faint shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow,background-color] duration-150 hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus:outline-none focus-visible:outline-none focus:bg-surface focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-soft)]';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leading, trailing, inputSize = 'md', ...props }, ref) => {
    const h = inputSize === 'sm' ? 'h-8 text-[13px]' : inputSize === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm';
    if (!leading && !trailing) {
      return <input ref={ref} className={cn(base, h, 'px-3', className)} {...props} />;
    }
    return (
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint [&_svg]:size-4">{leading}</span>
        )}
        <input ref={ref} className={cn(base, h, leading ? 'pl-9' : 'pl-3', trailing ? 'pr-10' : 'pr-3', className)} {...props} />
        {trailing && <span className="absolute inset-y-0 right-2 flex items-center text-faint [&_svg]:size-4">{trailing}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(base, 'min-h-20 resize-y px-3 py-2.5 text-sm leading-relaxed', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
