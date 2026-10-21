import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { subscribeSlowRequests } from '@/shared/api/http';
import { Spinner } from '@/shared/ui';

/** Explains slow first requests (the API host sleeps when idle) instead of leaving a frozen UI. */
export function ColdStartBanner() {
  const [slow, setSlow] = useState(0);
  useEffect(() => subscribeSlowRequests(setSlow), []);
  return (
    <AnimatePresence>
      {slow > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mx-3 mt-3 overflow-hidden rounded-[16px] bg-accent-soft text-accent-text sm:mx-5 sm:mt-5"
          role="status"
        >
          <div className="flex items-center justify-center gap-2.5 px-4 py-2 text-[13px] font-medium">
            <Spinner className="size-4" />
            Waking up the server — the first request after a quiet period can take up to 40 seconds.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
