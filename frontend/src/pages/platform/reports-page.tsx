import { Flag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { OrgReport } from '@/shared/types/api';
import { formatRelative } from '@/shared/lib/time';
import { Badge, Button, Card, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Field, PageHeader, Segmented, Select, Skeleton, Textarea, notify } from '@/shared/ui';
import { REPORT_CATEGORY_LABEL, useOrgReports, useReviewOrgReport } from '@/features/platform/api';

/** Reports volunteers filed against organizations. */
export default function PlatformReportsPage() {
  const [status, setStatus] = useState<'open' | 'reviewing' | 'resolved' | 'dismissed' | ''>('open');
  const reports = useOrgReports(status);
  const review = useReviewOrgReport();
  const [active, setActive] = useState<OrgReport | null>(null);
  const [next, setNext] = useState<OrgReport['status']>('reviewing');
  const [note, setNote] = useState('');

  useEffect(() => {
    document.title = 'Reports · VolunTrack';
  }, []);
  const rows = reports.data?.items ?? [];

  return (
    <>
      <PageHeader eyebrow="Trust & safety" title="Reports on organizations" description="Filed by volunteers. The organization never sees who reported it." />
      <Segmented
        className="mb-5"
        value={status}
        onValueChange={setStatus}
        size="sm"
        aria-label="Status"
        options={[
          { value: 'open', label: 'New' },
          { value: 'reviewing', label: 'Reviewing' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
          { value: '', label: 'All' },
        ]}
      />
      {reports.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : reports.error ? (
        <ErrorState error={reports.error} onRetry={() => reports.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Flag />} title="No reports here" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Flag className="size-4 text-danger-text" />
                <span className="font-semibold text-text">{REPORT_CATEGORY_LABEL[r.category]}</span>
                <span className="text-sm text-muted">about</span>
                <Link to={`/p/organizations/${r.org_id}`} className="text-sm font-medium text-accent-text hover:underline">
                  {r.organization?.name}
                </Link>
                {r.organization?.status && r.organization.status !== 'active' && <Badge size="sm" tone="danger">{r.organization.status}</Badge>}
                <Badge size="sm" className="ml-auto">
                  {r.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm whitespace-pre-line text-text wrap-anywhere">{r.details}</p>
              <div className="mt-2 text-[12.5px] text-faint">
                {r.reporter ? `${r.reporter.name} (${r.reporter.email})` : 'A volunteer'} · {formatRelative(r.created_at)}
                {r.event?.title && ` · event “${r.event.title}”`}
              </div>
              {r.resolution_note && <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-[13px] text-muted">Resolution: {r.resolution_note}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => (setActive(r), setNext(r.status === 'open' ? 'reviewing' : 'resolved'), setNote(r.resolution_note ?? ''))}>
                  Update
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/p/messages">Message the organization</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent title="Update report" description="Closing a report tells the volunteer it was reviewed." size="sm">
          <div className="space-y-4">
            <Field label="Status">
              <Select
                value={next}
                onValueChange={(v) => setNext(v as OrgReport['status'])}
                options={[
                  { value: 'reviewing', label: 'Reviewing' },
                  { value: 'resolved', label: 'Resolved — action taken' },
                  { value: 'dismissed', label: 'Dismissed — no issue found' },
                  { value: 'open', label: 'Re-open' },
                ]}
              />
            </Field>
            <Field label="Note" optional hint="Shared with the volunteer when resolved or dismissed.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </Field>
          </div>
          <DialogActions>
            <Button variant="ghost" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button
              loading={review.isPending}
              onClick={() => active && review.mutate({ id: active.id, status: next, resolution_note: note.trim() || undefined }, { onSuccess: () => (notify.success('Report updated'), setActive(null)) })}
            >
              Save
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
