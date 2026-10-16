import { Check, Clock4, PencilLine, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '@/shared/lib/time';
import { formatHours } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { Avatar, Badge, Button, Card, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Field, InlineAlert, Input, PageHeader, Skeleton, Textarea, notify } from '@/shared/ui';
import { usePendingHours, useVerifyHours, type PendingHours } from '@/features/operations/api';

export default function HoursPage() {
  const pending = usePendingHours();
  const verify = useVerifyHours();
  const [adjusting, setAdjusting] = useState<{ row: PendingHours; hours: string; note: string } | null>(null);

  useEffect(() => {
    document.title = 'Verify hours · VolunTrack';
  }, []);

  const act = (row: PendingHours, status: 'verified' | 'rejected' | 'adjusted', extra: { verified_hours?: number; note?: string } = {}) =>
    verify.mutate(
      { id: row.id, status, ...extra },
      {
        onSuccess: () => {
          notify.success(status === 'verified' ? 'Hours verified' : status === 'adjusted' ? 'Hours adjusted' : 'Hours not counted', `${row.volunteer.user?.full_name} · ${row.shift?.event?.title}`);
          setAdjusting(null);
        },
        onError: (e) => notify.error(e),
      },
    );

  const total = (pending.data ?? []).reduce((n, r) => n + r.hours, 0);

  return (
    <>
      <PageHeader
        eyebrow="Verify hours"
        title="Hours waiting for sign-off"
        description="Only verified hours count toward donor reports and certificates. Adjust when someone left early or forgot to check out."
        actions={pending.data?.length ? <Badge tone="warning">{formatHours(total)} across {pending.data.length} check-ins</Badge> : undefined}
      />
      {pending.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : pending.error ? (
        <ErrorState error={pending.error} onRetry={() => pending.refetch()} />
      ) : !pending.data?.length ? (
        <EmptyState icon={<Clock4 />} title="All hours are verified" description="New check-outs land here for your review." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Volunteer</th>
                <th className="px-5 py-3 font-medium">Shift</th>
                <th className="px-5 py-3 font-medium">Time on site</th>
                <th className="px-5 py-3 font-medium">Hours</th>
                <th className="px-5 py-3 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pending.data.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.volunteer.user?.full_name ?? '?'} size="sm" />
                      <span className="font-medium text-text">{r.volunteer.user?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="max-w-60 truncate text-text">{r.shift?.event?.title}</div>
                    <div className="text-[12px] text-faint">{formatDate(r.check_in_time, 'EEE d MMM')}</div>
                  </td>
                  <td className="type-data px-5 py-3.5 text-[12.5px] text-muted">
                    {formatTime(r.check_in_time)} – {formatTime(r.check_out_time)}
                    {!r.qr_verified && <span className="ml-2 text-warning-text">manual</span>}
                  </td>
                  <td className="type-data px-5 py-3.5 text-text">{formatHours(r.hours)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button size="xs" variant="success" onClick={() => act(r, 'verified')} loading={verify.isPending && verify.variables?.id === r.id && verify.variables.status === 'verified'}>
                        <Check /> Verify
                      </Button>
                      <Button size="xs" variant="secondary" onClick={() => setAdjusting({ row: r, hours: r.hours.toFixed(2), note: '' })}>
                        <PencilLine /> Adjust
                      </Button>
                      <Button size="xs" variant="ghost" aria-label="Don’t count these hours" onClick={() => act(r, 'rejected')}>
                        <X />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={Boolean(adjusting)} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent title="Adjust logged hours" description={adjusting ? `${adjusting.row.volunteer.user?.full_name} · logged ${formatHours(adjusting.row.hours)}` : undefined} size="sm">
          {adjusting && (
            <div className="space-y-4">
              <Field label="Hours to count">
                <Input type="number" step="0.25" min={0} max={24} value={adjusting.hours} onChange={(e) => setAdjusting({ ...adjusting, hours: e.target.value })} />
              </Field>
              <Field label="Note" optional>
                <Textarea rows={2} value={adjusting.note} onChange={(e) => setAdjusting({ ...adjusting, note: e.target.value })} placeholder="e.g. Left at 12:30 to catch the bus" />
              </Field>
              {verify.error && <InlineAlert tone="danger">{errorMessage(verify.error)}</InlineAlert>}
              <DialogActions>
                <Button variant="ghost" onClick={() => setAdjusting(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!(Number(adjusting.hours) >= 0 && Number(adjusting.hours) <= 24)}
                  loading={verify.isPending}
                  onClick={() => act(adjusting.row, 'adjusted', { verified_hours: Number(adjusting.hours), note: adjusting.note || undefined })}
                >
                  Save hours
                </Button>
              </DialogActions>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
