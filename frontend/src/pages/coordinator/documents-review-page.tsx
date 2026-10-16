import { Check, FileCheck2, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, InlineAlert, PageHeader, Segmented, Skeleton, Textarea, notify } from '@/shared/ui';
import { DOCUMENT_TYPES, useDocumentQueue, useReviewDocument } from '@/features/documents/api';
import type { VolunteerDocument } from '@/shared/types/api';

export default function DocumentsReviewPage() {
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const queue = useDocumentQueue(status);
  const review = useReviewDocument();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    document.title = 'Documents · VolunTrack';
  }, []);
  const list = queue.data ?? [];
  const selected: VolunteerDocument | undefined = list.find((d) => d.id === selectedId) ?? list[0];
  useEffect(() => setNotes(selected?.coordinator_notes ?? ''), [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = (s: 'verified' | 'rejected') =>
    selected &&
    review.mutate(
      { id: selected.id, status: s, notes: notes.trim() || null },
      {
        onSuccess: () => {
          notify.success(s === 'verified' ? 'Document verified' : 'Document rejected', `${selected.title} · ${selected.volunteer?.user?.full_name}`);
          setSelectedId(null);
        },
      },
    );

  return (
    <>
      <PageHeader eyebrow="Documents" title="Review documents" description="Verify certificates, IDs and parental consent forms. Verifying consent unlocks shifts for volunteers under 18." />
      <Segmented
        className="mb-5"
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setSelectedId(null);
        }}
        aria-label="Status"
        options={[
          { value: 'pending', label: 'To review' },
          { value: 'verified', label: 'Verified' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />
      {queue.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : queue.error ? (
        <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<FileCheck2 />} title={status === 'pending' ? 'Nothing to review' : 'No documents here'} description="Volunteers’ uploads appear here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <ul className="space-y-2">
            {list.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setSelectedId(d.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors', selected?.id === d.id ? 'bg-surface [box-shadow:var(--elev-1),inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface [box-shadow:inset_0_0_0_1px_var(--line)] hover:bg-surface-2')}
                >
                  <Avatar name={d.volunteer?.user?.full_name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-text">{d.title}</div>
                    <div className="truncate text-[12px] text-faint">
                      {d.volunteer?.user?.full_name} · {DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label} · {formatRelative(d.created_at)}
                    </div>
                  </div>
                  {d.document_type === 'parental_consent' && (
                    <Badge size="sm" tone="warning">
                      Consent
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <Card className="overflow-hidden lg:sticky lg:top-24 lg:self-start">
              <div className="grid h-80 place-items-center bg-sunken">
                {selected.mime_type.startsWith('image/') ? (
                  <img src={selected.file_url} alt={selected.title} className="max-h-full max-w-full object-contain" />
                ) : selected.mime_type.includes('pdf') ? (
                  <iframe title={selected.title} src={selected.file_url} className="size-full" />
                ) : (
                  <FileText className="size-10 text-faint" />
                )}
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h2 className="type-title text-lg text-text">{selected.title}</h2>
                  <p className="text-[13px] text-muted">
                    <Link to={`/c/volunteers/${selected.volunteer_id}`} className="font-medium text-accent-text hover:underline">
                      {selected.volunteer?.user?.full_name}
                    </Link>{' '}
                    · {DOCUMENT_TYPES.find((t) => t.value === selected.document_type)?.label} · {(selected.file_size_bytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                {selected.volunteer?.skills?.length ? (
                  <p className="text-[12.5px] text-faint">Listed skills: {selected.volunteer.skills.join(', ').replace(/_/g, ' ')}</p>
                ) : null}
                <Field label="Note to the volunteer" optional>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Valid until March 2027" disabled={status !== 'pending'} />
                </Field>
                {review.error && <InlineAlert tone="danger">{errorMessage(review.error)}</InlineAlert>}
                {status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="success" className="flex-1" onClick={() => decide('verified')} loading={review.isPending && review.variables?.status === 'verified'}>
                      <Check /> Verify
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={() => decide('rejected')} loading={review.isPending && review.variables?.status === 'rejected'}>
                      <X /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
