/** Dialog, Sheet (side drawer), Popover, Tooltip, DropdownMenu — Radix primitives in system styling. */
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from 'radix-ui';
import { X } from 'lucide-react';
import { useEffect, type ComponentProps, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const overlay =
  'fixed inset-0 z-50 bg-[rgba(3,12,13,0.62)] backdrop-blur-[3px] data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_140ms_ease-in]';

/**
 * Radix leaves `pointer-events: none` on <body> when a modal closes while another layer
 * (a dropdown that opened it, a nested select) is still unmounting — the page then looks
 * alive but nothing can be clicked. After any dialog closes we verify and clean it up.
 */
function releaseBodyLock() {
  window.setTimeout(() => {
    const anyOpen = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if (!anyOpen && document.body.style.pointerEvents === 'none') document.body.style.pointerEvents = '';
  }, 320);
}

export function Dialog({ onOpenChange, open, ...props }: ComponentProps<typeof D.Root>) {
  useEffect(() => {
    if (open === false) releaseBodyLock();
    return releaseBodyLock;
  }, [open]);
  return (
    <D.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) releaseBodyLock();
        onOpenChange?.(o);
      }}
      {...props}
    />
  );
}
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  size = 'md',
  hideClose,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideClose?: boolean;
}) {
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-raised p-6 [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] focus:outline-none',
          'data-[state=open]:animate-[dialog-in_260ms_var(--ease-out-expo)] data-[state=closed]:animate-[fade-out_120ms_ease-in]',
          w,
          className,
        )}
      >
        <div className="mb-5 pr-8">
          <D.Title className="type-title text-xl text-text">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1.5 text-sm text-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</D.Description>
          )}
        </div>
        {children}
        {!hideClose && (
          <D.Close
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>{children}</div>;
}

export const Sheet = Dialog;
export const SheetTrigger = D.Trigger;

export function SheetContent({
  title,
  description,
  children,
  side = 'right',
  className,
  width = 'md',
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  side?: 'right' | 'left' | 'bottom';
  className?: string;
  width?: 'sm' | 'md' | 'lg';
}) {
  const w = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl' }[width];
  const pos =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl data-[state=open]:animate-[sheet-up_320ms_var(--ease-out-expo)]'
      : cn(
          'inset-y-0 w-full',
          w,
          side === 'right'
            ? 'right-0 data-[state=open]:animate-[sheet-right_320ms_var(--ease-out-expo)]'
            : 'left-0 data-[state=open]:animate-[sheet-left_320ms_var(--ease-out-expo)]',
        );
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          'fixed z-50 flex flex-col bg-raised [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] focus:outline-none data-[state=closed]:animate-[fade-out_140ms_ease-in]',
          pos,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <D.Title className="type-title text-lg text-text">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === 'string' ? title : 'Panel'}</D.Description>
            )}
          </div>
          <D.Close className="grid size-8 shrink-0 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-text" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

const floating =
  'z-50 rounded-lg bg-raised [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)] data-[state=open]:animate-[pop-in_160ms_var(--ease-out-expo)] data-[state=closed]:animate-[fade-out_100ms_ease-in]';

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({ className, align = 'center', sideOffset = 8, ...props }: ComponentPropsWithoutRef<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={sideOffset} className={cn(floating, 'w-72 p-4 focus:outline-none', className)} {...props} />
    </P.Portal>
  );
}

export const TooltipProvider = T.Provider;
export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-64 rounded-md bg-text px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg data-[state=delayed-open]:animate-[pop-in_140ms_var(--ease-out-expo)]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

/** Non-modal by default so a menu item can open a dialog without locking the page. */
export function Menu({ modal = false, ...props }: ComponentProps<typeof DM.Root>) {
  return <DM.Root modal={modal} {...props} />;
}
export const MenuTrigger = DM.Trigger;
export function MenuContent({ className, align = 'end', ...props }: ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={6} className={cn(floating, 'min-w-48 p-1.5', className)} {...props} />
    </DM.Portal>
  );
}
export function MenuItem({ className, danger, ...props }: ComponentPropsWithoutRef<typeof DM.Item> & { danger?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors [&_svg]:size-4 [&_svg]:text-faint',
        danger ? 'text-danger-text data-[highlighted]:bg-danger-soft' : 'text-text data-[highlighted]:bg-surface-2',
        'data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2.5 pb-1 pt-2 type-eyebrow">{children}</DM.Label>;
}
export function MenuSeparator() {
  return <DM.Separator className="my-1.5 h-px bg-line" />;
}
