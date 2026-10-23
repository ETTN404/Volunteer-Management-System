/** Select, Checkbox, Switch, Slider, Tabs, Segmented control. */
import { Checkbox as CB, Select as S, Slider as SL, Switch as SW, Tabs as TB, ToggleGroup as TG } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/* ---------------- Select ---------------- */
export interface SelectOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Choose…',
  id,
  className,
  size = 'md',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
  'aria-label': ariaLabel,
  disabled,
}: {
  value: string | undefined;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md bg-sunken px-3 text-left text-text shadow-[inset_0_0_0_1px_var(--line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] data-[placeholder]:text-faint aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]',
          size === 'sm' ? 'h-8 text-[13px]' : 'h-10 text-sm',
          className,
        )}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDown className="size-4 text-faint" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-raised p-1.5 [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)] data-[state=open]:animate-[pop-in_160ms_var(--ease-out-expo)]"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-default select-none flex-col rounded-md py-2 pl-8 pr-3 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
              >
                <S.ItemIndicator className="absolute left-2.5 top-2.5">
                  <Check className="size-3.5 text-accent-text" />
                </S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
                {o.hint && <span className="text-xs text-faint">{o.hint}</span>}
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CB.Root> & { label?: ReactNode; description?: ReactNode }) {
  const id = useId();
  const box = (
    <CB.Root
      id={props.id ?? id}
      className="peer mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-sunken shadow-[inset_0_0_0_1.5px_var(--line-strong)] transition-colors data-[state=checked]:bg-accent data-[state=checked]:shadow-none focus-visible:outline-2 focus-visible:outline-focus"
      {...props}
    >
      <CB.Indicator>
        <Check className="size-3 text-accent-fg" strokeWidth={3.5} />
      </CB.Indicator>
    </CB.Root>
  );
  if (!label) return box;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {box}
      <label htmlFor={props.id ?? id} className="cursor-pointer text-sm leading-snug text-text">
        {label}
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </label>
    </div>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ className, ...props }: ComponentPropsWithoutRef<typeof SW.Root>) {
  return (
    <SW.Root
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition-colors data-[state=checked]:bg-success focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <SW.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-md transition-transform duration-200 ease-[var(--ease-out-expo)] data-[state=checked]:translate-x-[18px]" />
    </SW.Root>
  );
}

/* ---------------- Slider ---------------- */
export function Slider({ className, ...props }: ComponentPropsWithoutRef<typeof SL.Root>) {
  return (
    <SL.Root className={cn('relative flex h-6 w-full touch-none select-none items-center', className)} {...props}>
      <SL.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
        <SL.Range className="absolute h-full bg-accent" />
      </SL.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SL.Thumb
          key={i}
          aria-label={props['aria-label']}
          className="block size-5 rounded-full bg-white shadow-[0_0_0_4px_var(--accent-soft),0_2px_6px_rgba(0,0,0,0.3)] ring-2 ring-accent transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4"
        />
      ))}
    </SL.Root>
  );
}

/* ---------------- Tabs (underline, animated indicator) ---------------- */
export const Tabs = TB.Root;
export const TabsContent = TB.Content;

export function TabsList({
  tabs,
  value,
  className,
  layoutId = 'tabs-indicator',
}: {
  tabs: { value: string; label: ReactNode; count?: number }[];
  value: string;
  className?: string;
  layoutId?: string;
}) {
  return (
    <TB.List className={cn('relative flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <TB.Trigger
          key={t.value}
          value={t.value}
          className="relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium text-muted outline-none transition-colors hover:text-text data-[state=active]:text-text focus-visible:bg-surface-2"
        >
          {t.label}
          {t.count != null && (
            <span className="type-data rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{t.count}</span>
          )}
          {value === t.value && (
            <motion.span layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
          )}
        </TB.Trigger>
      ))}
    </TB.List>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  size = 'md',
  layoutId,
  'aria-label': ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  className?: string;
  size?: 'sm' | 'md';
  layoutId?: string;
  'aria-label'?: string;
}) {
  const fallbackId = useId();
  return (
    <TG.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn('relative inline-flex max-w-full overflow-x-auto rounded-full bg-sunken p-1 shadow-[inset_0_0_0_1px_var(--line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          className={cn(
            'relative z-10 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium text-muted outline-none transition-colors hover:text-text data-[state=on]:text-bg focus-visible:ring-2 focus-visible:ring-focus [&_svg]:size-3.5',
            size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-[13px]',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId ?? fallbackId}
              className="absolute inset-0 -z-10 rounded-full bg-text shadow-[0_4px_12px_-4px_rgba(17,21,43,0.45)]"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          {o.icon}
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
