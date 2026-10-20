import { Check, CircleDollarSign, RefreshCw, Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Payment } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import { formatNumber } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, CardBody, CardHeader, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Input, PageHeader, Segmented, Skeleton, Textarea, notify } from '@/shared/ui';
import { Bars, ChartCard } from '@/shared/ui/charts';
import { usePaymentSummary, usePayments, useRetryPayment, useReviewPayment } from '@/features/platform/api';

const SOURCE: Record<string, string> = { verifyet: 'Verify.ET', cheki: 'cheki', manual: 'Manual review' };

export default function PaymentsPage() {
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected' | ''>('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(q);
  const list = usePayments(status, deferred, page);
  const summary = usePaymentSummary();
  const review = useReviewPayment();
  const retry = useRetryPayment();
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    document.title = 'Payments · VolunTrack';
  }, []);
  const s = summary.data;
  const rows = list.data?.items ?? [];

  return (
    <>
      <PageHeader eyebrow="Platform" title="Payments" description="Plan upgrades paid by telebirr or bank transfer. Receipts are checked with the bank automatically; anything uncertain waits here." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: 'Revenue this month', v: s ? `${formatNumber(s.revenue_this_month)} ETB` : '—' },
          { l: 'Monthly recurring', v: s ? `${formatNumber(s.mrr)} ETB` : '—' },
          { l: 'Paying organizations', v: s ? formatNumber(s.paying_organizations) : '—' },
          { l: 'Waiting for review', v: s ? `${s.pending_count} · ${formatNumber(s.pending_amount)} ETB` : '—' },
          { l: 'Checked automatically', v: s?.auto_verified_share != null ? `${s.auto_verified_share}%` : '—' },
        ].map((k) => (
          <Card key={k.l} className="p-4">
            <div className="text-xs text-muted">{k.l}</div>
            <div className="type-data mt-1 text-lg font-semibold text-text">{k.v}</div>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard title="Revenue by month" description="Confirmed payments, ETB">
          {s ? <Bars data={s.months} x="month" y="revenue" unit=" ETB" height={220} /> : <Skeleton className="h-56" />}
        </ChartCard>
        <Card>
          <CardHeader title="Plans expiring in 14 days" />
          <CardBody>
            {!s ? (
              <Skeleton className="h-32" />
            ) : s.expiring_soon.length === 0 ? (
              <p className="text-sm text-muted">Nothing expiring soon.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {s.expiring_soon.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2">
                    <Link to={`/p/organizations/${o.id}`} className="font-medium text-text hover:text-accent-text">
                      {o.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {o.subscription_plan} · {formatDate(o.plan_expires_at, 'd MMM')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          size="sm"
          aria-label="Status"
          options={[
            { value: 'pending', label: 'To review' },
            { value: 'verified', label: 'Confirmed' },
            { value: 'rejected', label: 'Rejected' },
            { value: '', label: 'All' },
          ]}
        />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference or organization" leading={<Search />} className="sm:ml-auto sm:w-72" aria-label="Search payments" />
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<CircleDollarSign />} title={status === 'pending' ? 'Nothing to review' : 'No payments'} />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Card key={p.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/p/organizations/${p.org_id}`} className="font-medium text-text hover:text-accent-text">
                      {p.organization?.name}
                    </Link>
                    <Badge size="sm" tone={p.status === 'verified' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>
                      {p.status}
                    </Badge>
                    <span className="text-xs text-faint">{formatDate(p.created_at, 'd MMM yyyy HH:mm')}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    <span className="type-data text-text">
                      {formatNumber(p.amount)} {p.currency}
                    </span>{' '}
                    · {p.plan} × {p.months} mo · {p.method} · <span className="type-data">{p.transaction_ref}</span>
                    {p.payer_name ? ` · paid by ${p.payer_name}` : ''}
                  </div>
                  <div className="mt-1 text-[12.5px] text-faint">
                    {SOURCE[p.verification_source] ?? p.verification_source}: {p.verification_note ?? p.notes ?? '—'}
                    {p.receipt?.receiver_name && ` · receiver “${p.receipt.receiver_name}”`}
                    {p.receipt?.amount != null && ` · receipt ${formatNumber(p.receipt.amount)} ETB`}
                  </div>
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" loading={retry.isPending && retry.variables === p.id} onClick={() => retry.mutate(p.id, { onSuccess: (r) => notify.info(r.message ?? 'Checked'), onError: (e) => notify.error(errorMessage(e)) })}>
                      <RefreshCw /> Check again
                    </Button>
                    <Button size="sm" variant="danger-soft" onClick={() => (setRejecting(p), setNote(''))}>
                      <X /> Reject
                    </Button>
                    <Button size="sm" variant="success" loading={review.isPending && review.variables?.id === p.id} onClick={() => review.mutate({ id: p.id, status: 'verified' }, { onSuccess: () => notify.success('Payment confirmed — plan activated') })}>
                      <Check /> Confirm
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {list.data && list.data.pagination.last_page > 1 && (
            <div className="flex justify-center gap-3 pt-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= list.data.pagination.last_page} onClick={() => setPage((x) => x + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent title="Reject this payment?" description="The organization admins are told why." size="sm">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Reference not found at the bank" aria-label="Reason" />
          <DialogActions>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={note.trim().length < 3}
              loading={review.isPending}
              onClick={() => rejecting && review.mutate({ id: rejecting.id, status: 'rejected', notes: note.trim() }, { onSuccess: () => (notify.success('Payment rejected'), setRejecting(null)) })}
            >
              Reject
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
