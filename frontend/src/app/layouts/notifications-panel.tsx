import { Award, BadgeCheck, BellOff, CalendarCheck2, CalendarX2, Clock4, CreditCard, FileCheck2, Flag, LogOut, Megaphone, MessageSquare, ShieldAlert, Siren, UserMinus } from 'lucide-react';
import { useSession } from '@/features/auth/use-session';
import { useNavigate } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/time';
import { Button, EmptyState, Sheet, SheetContent, Skeleton } from '@/shared/ui';
import type { AppNotification } from '@/shared/types/api';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/api';

const OK = 'bg-success-soft text-success-text';
const BAD = 'bg-danger-soft text-danger-text';
const INFO = 'bg-info-soft text-info-text';
const ACC = 'bg-accent-soft text-accent-text';
const WARN = 'bg-warning-soft text-warning-text';

const KIND: Record<string, { icon: typeof Award; tone: string }> = {
  shift_approved: { icon: CalendarCheck2, tone: OK },
  shift_broadcast: { icon: Siren, tone: BAD },
  shift_changed: { icon: Clock4, tone: WARN },
  shift_cancelled: { icon: CalendarX2, tone: BAD },
  application_declined: { icon: CalendarX2, tone: WARN },
  certificate_issued: { icon: Award, tone: ACC },
  hours_reviewed: { icon: BadgeCheck, tone: OK },
  auto_checked_out: { icon: LogOut, tone: WARN },
  volunteer_left_early: { icon: LogOut, tone: BAD },
  volunteer_withdrew: { icon: UserMinus, tone: WARN },
  organization_suspended: { icon: ShieldAlert, tone: BAD },
  organization_inactive: { icon: ShieldAlert, tone: BAD },
  organization_active: { icon: BadgeCheck, tone: OK },
  organization_verification: { icon: BadgeCheck, tone: OK },
  organization_signup: { icon: Flag, tone: INFO },
  organization_document: { icon: FileCheck2, tone: INFO },
  organization_reported: { icon: Flag, tone: BAD },
  report_closed: { icon: Flag, tone: INFO },
  announcement: { icon: Megaphone, tone: INFO },
  document_reviewed: { icon: FileCheck2, tone: OK },
  document_uploaded: { icon: FileCheck2, tone: INFO },
  payment_pending: { icon: CreditCard, tone: WARN },
  payment_verified: { icon: CreditCard, tone: OK },
  payment_rejected: { icon: CreditCard, tone: BAD },
  support_message: { icon: MessageSquare, tone: ACC },
};

export function NotificationsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const { role } = useSession();
  // Announcements carry no link: send each role to its own announcements page.
  const linkFor = (n: AppNotification) => n.action_url ?? (n.type === 'announcement' ? (role === 'Volunteer' ? '/v/announcements' : '/c/announcements') : null);

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
            const k = KIND[n.type] ?? { icon: Megaphone, tone: INFO };
            const Icon = k.icon;
            const to = linkFor(n);
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                  if (to) {
                    onOpenChange(false);
                    navigate(to);
                  }
                }}
                className="group flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', k.tone)}>
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
