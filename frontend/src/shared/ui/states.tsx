import { AlertTriangle, Hourglass, RotateCw, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { errorMessage, isApiError, isRouteMissing } from '@/shared/api/http';
import { Button } from './button';

/** An empty screen is an invitation to act: say what goes here and how to add it. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-contours relative flex flex-col items-center justify-center overflow-hidden rounded-lg text-center [box-shadow:inset_0_0_0_1px_var(--line)]',
        compact ? 'gap-2 px-6 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div className="relative mb-1 grid size-14 place-items-center">
          <span className="absolute inset-0 rounded-full border border-dashed border-line-strong" />
          <span className="absolute inset-2 rounded-full bg-surface-2" />
          <span className="relative text-muted [&_svg]:size-5">{icon}</span>
        </div>
      )}
      <h3 className="type-title text-base text-text">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, title }: { error: unknown; onRetry?: () => void; className?: string; title?: string }) {
  if (isRouteMissing(error)) {
    return (
      <EmptyState
        className={className}
        icon={<Hourglass />}
        title="Coming soon"
        description="This part of VolunTrack is ready in the app and waiting on a server update. It will appear here automatically once it ships."
      />
    );
  }
  const offline = isApiError(error) && (error.kind === 'network' || error.kind === 'timeout');
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg bg-danger-soft/50 px-6 py-10 text-center [box-shadow:inset_0_0_0_1px_var(--danger-soft)]', className)}>
      <div className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger-text">
        {offline ? <WifiOff className="size-5" /> : <AlertTriangle className="size-5" />}
      </div>
      <div>
        <h3 className="type-title text-base text-text">{title ?? (offline ? 'Can’t reach the server' : 'This didn’t load')}</h3>
        <p className="mt-1 max-w-md text-sm text-muted">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'accent';
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-info-soft text-info-text',
    warning: 'bg-warning-soft text-warning-text',
    danger: 'bg-danger-soft text-danger-text',
    success: 'bg-success-soft text-success-text',
    accent: 'bg-accent-soft text-accent-text',
  };
  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-4 py-3.5', tones[tone], className)} role={tone === 'danger' ? 'alert' : 'status'}>
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-text/80', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
