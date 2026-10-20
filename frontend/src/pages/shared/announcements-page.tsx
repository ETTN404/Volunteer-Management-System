import { Megaphone } from 'lucide-react';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/use-session';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { Badge, Card, EmptyState, ErrorState, PageHeader, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { AUDIENCE_LABEL, useAnnouncements, useMarkAnnouncementsRead } from '@/features/announcements/api';

export default function AnnouncementsPage() {
  const list = useAnnouncements();
  const markRead = useMarkAnnouncementsRead();
  const { user } = useSession();
  useEffect(() => {
    document.title = 'Announcements · VolunTrack';
  }, []);
  // Opening the page marks what you can see as read.
  const unreadIds = (list.data?.items ?? []).filter((a) => !a.is_read).map((a) => a.id).join(',');
  useEffect(() => {
    if (unreadIds) markRead.mutate(unreadIds.split(',').map(Number));
  }, [unreadIds]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <PageHeader
        eyebrow="Announcements"
        title={user?.role === 'Volunteer' ? 'News from your organizations' : 'Announcements'}
        description={user?.role === 'Volunteer' ? 'From every organization you volunteer with or applied to.' : undefined}
      />
      {list.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data?.items.length ? (
        <Stagger className="mx-auto max-w-3xl space-y-4">
          {list.data.items.map((a) => (
            <StaggerItem key={a.id}>
              <Card className={a.kind === 'urgent' ? 'min-w-0 p-5 sm:p-6 [box-shadow:inset_0_0_0_1.5px_var(--danger)]' : 'min-w-0 p-5 sm:p-6'}>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-faint">
                  {!a.is_read && <span className="size-2 rounded-full bg-accent" aria-label="New" />}
                  {a.kind === 'urgent' && (
                    <Badge size="sm" tone="danger">
                      Urgent
                    </Badge>
                  )}
                  {a.organization && <span className="font-medium text-text">{a.organization.name}</span>}
                  <Badge size="sm" tone={a.target_audience === 'all' ? 'accent' : 'neutral'}>
                    {AUDIENCE_LABEL[a.target_audience]}
                  </Badge>
                  <time dateTime={a.created_at} title={formatDate(a.created_at, 'd MMM yyyy HH:mm')}>
                    {formatRelative(a.created_at)}
                  </time>
                </div>
                <h2 className="type-title text-lg text-text wrap-anywhere">{a.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-muted wrap-anywhere">{a.message}</p>
                {a.poster && <p className="mt-3 text-[12px] text-faint">Posted by {a.poster.full_name}</p>}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState icon={<Megaphone />} title="No announcements yet" description="Your coordinators’ updates will appear here." />
      )}
    </>
  );
}
