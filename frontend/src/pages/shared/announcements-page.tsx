import { Megaphone } from 'lucide-react';
import { useEffect } from 'react';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { Badge, Card, EmptyState, ErrorState, PageHeader, SkeletonCard } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { AUDIENCE_LABEL, useAnnouncements } from '@/features/announcements/api';

export default function AnnouncementsPage() {
  const list = useAnnouncements();
  useEffect(() => {
    document.title = 'Announcements · VolunTrack';
  }, []);
  return (
    <>
      <PageHeader eyebrow="Announcements" title="News from your organization" />
      {list.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data?.length ? (
        <Stagger className="mx-auto max-w-3xl space-y-4">
          {list.data.map((a) => (
            <StaggerItem key={a.id}>
              <Card className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-faint">
                  <Badge size="sm" tone={a.target_audience === 'all' ? 'accent' : 'neutral'}>
                    {AUDIENCE_LABEL[a.target_audience]}
                  </Badge>
                  <time dateTime={a.created_at} title={formatDate(a.created_at, 'd MMM yyyy HH:mm')}>
                    {formatRelative(a.created_at)}
                  </time>
                </div>
                <h2 className="type-title text-lg text-text">{a.title}</h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted">{a.message}</p>
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
