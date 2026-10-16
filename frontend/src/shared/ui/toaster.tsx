import { Toaster as Sonner, toast } from 'sonner';
import { errorMessage } from '@/shared/api/http';

export function Toaster({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !bg-raised !text-text ![box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] !border-0 !font-sans !text-sm !gap-3 !px-4 !py-3.5',
          description: '!text-muted !text-[13px]',
          actionButton: '!bg-accent !text-accent-fg !rounded-md !font-medium',
          cancelButton: '!bg-surface-2 !text-muted !rounded-md',
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-danger',
          warning: '[&_[data-icon]]:!text-warning',
          info: '[&_[data-icon]]:!text-info',
        },
      }}
    />
  );
}

/** Toast helpers with the system voice: say what happened, specifically. */
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  info: (title: string, description?: string) => toast.info(title, { description }),
  warning: (title: string, description?: string) => toast.warning(title, { description }),
  error: (e: unknown, fallback?: string) => toast.error(errorMessage(e, fallback)),
  message: toast,
};
