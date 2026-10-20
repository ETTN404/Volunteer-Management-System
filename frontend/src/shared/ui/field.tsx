import { cloneElement, createContext, isValidElement, useContext, useId, type ReactElement, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  /** Right side of the label row (e.g. "Forgot password?") */
  aside?: ReactNode;
  children: ReactElement<Record<string, unknown>>;
}

interface FieldControl {
  id: string;
  describedBy?: string;
  invalid?: boolean;
}
const FieldContext = createContext<FieldControl | null>(null);

/**
 * For custom controls rendered inside a Field through a wrapper (e.g. react-hook-form
 * Controller), where Field cannot inject props: returns the id/aria wiring to use.
 */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext);
}

/** Label + control + hint/error, wired with ids and aria attributes. */
export function Field({ label, hint, error, optional, className, aside, children }: FieldProps) {
  const id = useId();
  const controlId = (children.props.id as string | undefined) ?? id;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={controlId} className="text-[13px] font-medium text-text">
          {label}
          {optional && <span className="ml-1.5 font-normal text-faint">optional</span>}
        </label>
        {aside}
      </div>
      <FieldContext.Provider value={{ id: controlId, describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined, invalid: Boolean(error) }}>{control}</FieldContext.Provider>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-[12.5px] text-danger-text" role="alert">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12.5px] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-sm text-danger-text">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
