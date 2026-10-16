import { Siren } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { VmsEvent } from '@/shared/types/api';
import { formatDay, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { AvatarStack, Button, Dialog, DialogActions, DialogContent, Field, InlineAlert, Select, Skeleton, notify } from '@/shared/ui';
import { useBroadcast, useBroadcastPreview } from '../api';

/** Urgent broadcast to volunteers whose skills match the shift (BR-07). */
export function BroadcastDialog({ events, open, onOpenChange, initialShiftId }: { events: VmsEvent[]; open: boolean; onOpenChange: (o: boolean) => void; initialShiftId?: number }) {
  const shifts = events
    .flatMap((e) => (e.shifts ?? []).map((s) => ({ s, e })))
    .filter(({ s }) => (parseApiDate(s.end_time) ?? new Date(0)) > new Date())
    .sort((a, b) => a.s.start_time.localeCompare(b.s.start_time));
  const [shiftId, setShiftId] = useState<number | null>(initialShiftId ?? null);
  useEffect(() => {
    if (open) setShiftId(initialShiftId ?? shifts[0]?.s.id ?? null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useBroadcastPreview(open ? shiftId : null);
  const send = useBroadcast();
  const target = shifts.find((x) => x.s.id === shiftId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Send an urgent shift alert" description="Only volunteers whose skills match the shift are notified." size="md">
        <div className="space-y-5">
          <Field label="Shift">
            <Select
              value={shiftId ? String(shiftId) : undefined}
              onValueChange={(v) => setShiftId(Number(v))}
              placeholder="Choose a shift"
              options={shifts.map(({ s, e }) => ({ value: String(s.id), label: `${e.title} · ${formatDay(s.start_time)} ${formatTimeRange(s.start_time, s.end_time)}`, hint: `${s.confirmed_count ?? 0}/${s.capacity} confirmed` }))}
            />
          </Field>
          {target && (
            <div className="rounded-lg bg-surface-2 p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {target.s.required_skills.length ? (
                  target.s.required_skills.map((k) => (
                    <span key={k} className="rounded-md bg-surface px-2 py-1 text-[11.5px] text-muted">
                      {humanizeSkill(k)}
                    </span>
                  ))
                ) : (
                  <span className="text-[12.5px] text-faint">Open to everyone</span>
                )}
              </div>
              {preview.isLoading ? (
                <Skeleton className="h-10" />
              ) : preview.data ? (
                <div className="flex items-center gap-4">
                  <AvatarStack names={preview.data.sample.map((v) => v.full_name)} max={5} />
                  <div className="text-sm">
                    <div className="font-semibold text-text">{preview.data.matching_volunteers} volunteers will be alerted</div>
                    <div className="text-muted">{preview.data.remaining_slots} spots still open</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Matching volunteers will be notified by the background queue.</p>
              )}
            </div>
          )}
          {send.error && <InlineAlert tone="danger">{errorMessage(send.error)}</InlineAlert>}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!shiftId || preview.data?.matching_volunteers === 0}
            loading={send.isPending}
            onClick={() =>
              shiftId &&
              send.mutate(shiftId, {
                onSuccess: () => {
                  notify.success('Alert queued', `Matching volunteers are being notified about ${target?.e.title}.`);
                  onOpenChange(false);
                },
              })
            }
          >
            <Siren /> Send alert
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
