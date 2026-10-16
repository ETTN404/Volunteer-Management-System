import { Award, BellOff, CalendarCheck2, FileCheck2, Megaphone, ShieldAlert, Siren } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/time';
import { Button, EmptyState, Sheet, SheetContent, Skeleton } from '@/shared/ui';
import type { AppNotification } from '@/shared/types/api';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/api';

const ICON: Record<AppNotification['type'], typeof Award> = {
  shift_approved: CalendarCheck2,
  shift_broadcast: Siren,
  certificate_issued: Award,
  organization_suspended: ShieldAlert,
  announcement: Megaphone,
  document_reviewed: FileCheck2,
};

const TONE: Record<AppNotification['type'], string> = {
  shift_approved: 'bg-success-soft text-success-text',
  shift_broadcast: 'bg-danger-soft text-danger-text',
  certificate_issued: 'bg-accent-soft text-accent-text',
  organization_suspended: 'bg-danger-soft text-danger-text',
  announcement: 'bg-info-soft text-info-text',
  document_reviewed: 'bg-success-soft text-success-text',
};

export function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Notifications"
        description={data?.unread ? `${data.unread} unread` : 'You’re all caught up'}
        width="sm"
      >
        <div className="-mx-2 space-y-1">
          {data && data.unread > 0 && (
            <div className="mb-3 flex justify-end px-2">
              <Button variant="ghost" size="xs" onClick={() => markAll.mutate()} loading={markAll.isPending}>
                Mark all as read
              </Button>
            </div>
          )}
          {isLoading &&
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          {data && data.items.length === 0 && (
            <EmptyState icon={<BellOff />} title="No notifications yet" description="Approvals, urgent shifts and certificates will show up here." compact />
          )}
          {data?.items.map((n) => {
            const Icon = ICON[n.type] ?? Megaphone;
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                  if (n.action_url) {
                    onOpenChange(false);
                    navigate(n.action_url);
                  }
                }}
                className="group flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', TONE[n.type])}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn('text-sm', n.read_at ? 'text-muted' : 'font-semibold text-text')}>{n.title}</span>
                    {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">{n.body}</span>
                  <span className="mt-1 block text-[11.5px] text-faint">{formatRelative(n.created_at)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
