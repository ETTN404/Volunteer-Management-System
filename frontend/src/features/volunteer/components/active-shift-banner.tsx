import { AnimatePresence, motion } from 'motion/react';
import { Award, LogOut, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatHours } from '@/shared/lib/format';
import { formatTime } from '@/shared/lib/time';
import { useNow } from '@/shared/hooks/use-now';
import { Button, Dialog, DialogActions, DialogContent, InlineAlert } from '@/shared/ui';
import { errorMessage } from '@/shared/api/http';
import type { CheckOutResult } from '@/shared/types/api';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { useCheckOut } from '../api';
import { useMyShifts } from '../derived';

function Elapsed({ since }: { since: string }) {
  const now = useNow(1000);
  const ms = Math.max(0, now.getTime() - new Date(since).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return <span className="type-data tabular-nums">{`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}</span>;
}

/** App-wide strip for a volunteer currently on shift, with check-out and the result celebration. */
export function ActiveShiftBanner() {
  const { active } = useMyShifts();
  const checkOut = useCheckOut();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<CheckOutResult | null>(null);

  return (
    <>
      <AnimatePresence>
        {active && !result && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-success/25 bg-success-soft">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping-ring rounded-full bg-success" />
                <span className="relative size-2.5 rounded-full bg-success" />
              </span>
              <span className="text-[13.5px] text-text">
                On shift at <span className="font-semibold">{active.event.title}</span> · <Elapsed since={active.attendance!.check_in_time} />
              </span>
              <Button size="xs" variant="success" className="ml-auto" onClick={() => setConfirm(true)}>
                <LogOut /> Check out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Check out of this shift?" description={active ? `${active.event.title} · checked in at ${formatTime(active.attendance?.check_in_time)}` : undefined} size="sm">
          <p className="text-sm text-muted">Your hours are calculated from your check-in time to now and sent to your coordinator to verify.</p>
          {checkOut.error && (
            <InlineAlert tone="danger" className="mt-4">
              {errorMessage(checkOut.error)}
            </InlineAlert>
          )}
          <DialogActions>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Stay checked in
            </Button>
            <Button
              variant="success"
              loading={checkOut.isPending}
              onClick={() =>
                active &&
                checkOut.mutate(active.shift.id, {
                  onSuccess: ({ result }) => {
                    setConfirm(false);
                    setResult(result);
                  },
                })
              }
            >
              Check out
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(result)} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent title="Thank you for your service" size="sm">
          {result && (
            <div className="text-center">
              {result.milestones_reached.length > 0 ? (
                <motion.div initial={{ scale: 0.6, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} className="mx-auto mb-5 w-fit">
                  <CertificateSeal hours={result.milestones_reached.at(-1)!} size={140} />
                </motion.div>
              ) : (
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-soft text-success-text">
                  <Sparkles className="size-7" />
                </div>
              )}
              <div className="type-display text-6xl text-text">{formatHours(result.hours_logged)}</div>
              <p className="mt-2 text-sm text-muted">logged this shift · {formatHours(result.cumulative_hours)} in total</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg bg-surface-2 p-3">
                  <div className="type-eyebrow-sm">Impact score</div>
                  <div className="type-data mt-1 text-xl text-text">{result.impact_score.toFixed(1)}</div>
                </div>
                <div className="rounded-lg bg-surface-2 p-3">
                  <div className="type-eyebrow-sm">Hours status</div>
                  <div className="mt-1 text-sm font-medium text-warning-text">Awaiting coordinator</div>
                </div>
              </div>
              {result.milestones_reached.length > 0 && (
                <InlineAlert tone="accent" icon={<Award />} className="mt-4 text-left" title={`${result.milestones_reached.join(' & ')}-hour certificate issued`}>
                  It’s ready to download and share from Certificates.
                </InlineAlert>
              )}
              <DialogActions className="sm:justify-center">
                {result.milestones_reached.length > 0 && (
                  <Button asChild variant="secondary" onClick={() => setResult(null)}>
                    <Link to="/v/certificates">See certificate</Link>
                  </Button>
                )}
                <Button onClick={() => setResult(null)}>Done</Button>
              </DialogActions>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
