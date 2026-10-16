import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AssignmentStatus } from '@/shared/types/api';
import { ErrorState, Input, PageHeader, Segmented, Select } from '@/shared/ui';
import { useAllApplications, useAllOrgEvents } from '@/features/operations/api';
import { ApplicationsTable } from '@/features/operations/components/applications-table';
import { matchScore } from '@/shared/lib/skills';

export default function ApplicationsPage() {
  const events = useAllOrgEvents();
  const apps = useAllApplications(events.data);
  const [status, setStatus] = useState<AssignmentStatus | 'all'>('pending');
  const [eventId, setEventId] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'fit' | 'soonest' | 'newest'>('fit');

  useEffect(() => {
    document.title = 'Applications · VolunTrack';
  }, []);

  const rows = useMemo(() => {
    let r = apps.data;
    if (status !== 'all') r = r.filter((a) => a.status === status);
    if (eventId !== 'all') r = r.filter((a) => a.event.id === Number(eventId));
    if (q.trim()) r = r.filter((a) => `${a.volunteer?.user?.full_name} ${a.event.title}`.toLowerCase().includes(q.trim().toLowerCase()));
    const fit = (a: (typeof r)[number]) => matchScore(a.volunteer?.skills ?? [], a.shift?.required_skills ?? []);
    return [...r].sort((a, b) =>
      sort === 'fit' ? fit(b) - fit(a) : sort === 'soonest' ? (a.shift?.start_time ?? '').localeCompare(b.shift?.start_time ?? '') : b.applied_at.localeCompare(a.applied_at),
    );
  }, [apps.data, status, eventId, q, sort]);

  const counts = useMemo(() => ({ pending: apps.data.filter((a) => a.status === 'pending').length, all: apps.data.length }), [apps.data]);

  return (
    <>
      <PageHeader eyebrow="Applications" title="Review applications" description="Approve the best fit for each shift. Skill gaps are highlighted so you can ask for proof before confirming." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          value={status}
          onValueChange={setStatus}
          aria-label="Status"
          options={[
            { value: 'pending', label: `Pending · ${counts.pending}` },
            { value: 'confirmed', label: 'Approved' },
            { value: 'cancelled', label: 'Declined' },
            { value: 'all', label: `All · ${counts.all}` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search volunteer or event" leading={<Search />} className="sm:w-60" aria-label="Search applications" inputSize="sm" />
          <div className="sm:w-56">
            <Select aria-label="Event" size="sm" value={eventId} onValueChange={setEventId} options={[{ value: 'all', label: 'All events' }, ...(events.data ?? []).map((e) => ({ value: String(e.id), label: e.title }))]} />
          </div>
          <div className="sm:w-40">
            <Select
              aria-label="Sort applications"
              size="sm"
              value={sort}
              onValueChange={(v) => setSort(v as typeof sort)}
              options={[
                { value: 'fit', label: 'Best fit first' },
                { value: 'soonest', label: 'Soonest shift' },
                { value: 'newest', label: 'Newest first' },
              ]}
            />
          </div>
        </div>
      </div>
      {events.error ? <ErrorState error={events.error} onRetry={() => events.refetch()} /> : <ApplicationsTable rows={rows} isLoading={events.isLoading || apps.isLoading} />}
    </>
  );
}
