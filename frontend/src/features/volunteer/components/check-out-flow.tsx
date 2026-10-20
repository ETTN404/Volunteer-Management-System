import { motion } from 'motion/react';
import { Hourglass, LogOut, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatHours } from '@/shared/lib/format';
import { formatTime } from '@/shared/lib/time';
import { errorMessage, isApiError } from '@/shared/api/http';
import { cn } from '@/shared/lib/cn';
import type { CheckOutResult } from '@/shared/types/api';
import { Button, Dialog, DialogActions, DialogContent, InlineAlert, Textarea, notify } from '@/shared/ui';
import { useCheckOut, useResumeShift } from '../api';
import { quietPosition } from '../presence';
import type { ScheduledShift } from '../derived';

const QUICK_REASONS = ['Task finished early', 'Feeling unwell', 'Family emergency', 'Transport leaving', 'Coordinator sent me home'];

/**
 * Check-out with the rules made visible:
 * - leaving more than 15 min early asks for a reason (the coordinator is alerted),
 * - the result explains that hours wait for coordinator verification,
 * - "I checked out by mistake" resumes the shift within 10 minutes.
 */
export function CheckOutDialog({ row, open, onOpenChange, onDone }: { row: ScheduledShift; open: boolean; onOpenChange: (o: boolean) => void; onDone?: (r: CheckOutResult) => void }) {
  const checkOut = useCheckOut();
  const [reason, setReason] = useState('');
  const minutesLeft = Math.round((row.end.getTime() - Date.now()) / 60_000);
  const early = minutesLeft > 15;
  const needsReason = early || (isApiError(checkOut.error) && checkOut.error.code === 'reason_required');

  useEffect(() => {
    if (!open) {
      setReason('');
      checkOut.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const pos = await quietPosition(5000);
    checkOut.mutate(
      {
        shift_id: row.shift.id,
        reason: reason.trim() || undefined,
        latitude: pos?.coords.latitude,
        longitude: pos?.coords.longitude,
        accuracy: pos?.coords.accuracy,
      },
      {
        onSuccess: ({ result }) => {
          onOpenChange(false);
          onDone?.(result);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={early ? 'Leaving before the shift ends?' : 'Check out of this shift?'} description={`${row.event.title} · checked in at ${formatTime(row.attendance?.check_in_time)}`} size="sm">
        {needsReason ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              The shift ends at <span className="font-medium text-text">{formatTime(row.end)}</span> ({minutesLeft} min from now). Tell your coordinator why — they need to fill your place.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', reason === r ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Or write your own reason" aria-label="Reason for leaving early" />
          </div>
        ) : (
          <p className="text-sm text-muted">Your time from check-in to now is sent to your coordinator, who verifies the hours.</p>
        )}
        {checkOut.error && !(isApiError(checkOut.error) && checkOut.error.code === 'reason_required') && (
          <InlineAlert tone="danger" className="mt-4">
            {errorMessage(checkOut.error)}
          </InlineAlert>
        )}
        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Stay on shift
          </Button>
          <Button variant={early ? 'danger' : 'success'} loading={checkOut.isPending} disabled={needsReason && reason.trim().length < 3} onClick={submit}>
            <LogOut /> {early ? 'Leave early' : 'Check out'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

/** "Thank you" sheet after check-out, with the undo option while it is still allowed. */
export function CheckOutResultDialog({ result, onClose }: { result: CheckOutResult | null; onClose: () => void }) {
  const resume = useResumeShift();
  return (
    <Dialog open={Boolean(result)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Thank you for your service" size="sm">
        {result && (
          <div className="text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-soft text-success-text">
              <Sparkles className="size-7" />
            </motion.div>
            <div className="type-display text-6xl text-text">{formatHours(result.hours_logged)}</div>
            <p className="mt-2 text-sm text-muted">recorded this shift</p>
            <InlineAlert tone="info" icon={<Hourglass />} className="mt-5 text-left" title="Waiting for your coordinator">
              Hours count toward your impact and certificates once a coordinator verifies them. You’ll get a notification. Verified so far: {formatHours(result.cumulative_hours)}.
            </InlineAlert>
            {result.can_resume && (
              <button
                type="button"
                disabled={resume.isPending}
                onClick={() =>
                  resume.mutate(result.shift_id, {
                    onSuccess: () => {
                      notify.success('You’re back on shift');
                      onClose();
                    },
                    onError: (e) => notify.error(errorMessage(e)),
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline disabled:opacity-50"
              >
                <RotateCcw className="size-4" /> I checked out by mistake — resume my shift
              </button>
            )}
            <DialogActions className="sm:justify-center">
              <Button onClick={onClose}>Done</Button>
            </DialogActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
