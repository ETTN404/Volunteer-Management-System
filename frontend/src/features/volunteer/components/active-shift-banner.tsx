import { AnimatePresence, motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNow } from '@/shared/hooks/use-now';
import { Button } from '@/shared/ui';
import type { CheckOutResult } from '@/shared/types/api';
import { useMyShifts } from '../derived';
import { usePresencePings } from '../presence';
import { CheckOutDialog, CheckOutResultDialog } from './check-out-flow';
import { useT } from '@/shared/i18n';

function Elapsed({ since }: { since: string }) {
  const now = useNow(1000);
  const ms = Math.max(0, now.getTime() - new Date(since).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return <span className="type-data tabular-nums">{`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}</span>;
}

/** App-wide strip for a volunteer currently on shift: elapsed time, presence pings and check-out. */
export function ActiveShiftBanner() {
  const { active } = useMyShifts();
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<CheckOutResult | null>(null);
  usePresencePings(active?.shift.id);

  return (
    <>
      <AnimatePresence>
        {active && !result && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mx-3 mt-3 overflow-hidden rounded-[16px] bg-success-soft [box-shadow:inset_0_0_0_1px_color-mix(in_oklab,var(--success)_25%,transparent)] sm:mx-5 sm:mt-5">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inset-0 animate-ping-ring rounded-full bg-success" />
                <span className="relative size-2.5 rounded-full bg-success" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">
                {t('On shift')} · <span className="font-semibold">{active.event.title}</span> · <Elapsed since={active.attendance!.check_in_time} />
              </span>
              <Button size="xs" variant="success" className="shrink-0" onClick={() => setConfirm(true)}>
                <LogOut /> {t('Check out')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {active && <CheckOutDialog row={active} open={confirm} onOpenChange={setConfirm} onDone={setResult} />}
      <CheckOutResultDialog result={result} onClose={() => setResult(null)} />
    </>
  );
}
