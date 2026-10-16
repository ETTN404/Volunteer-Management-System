import { CameraOff } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Skeleton } from '@/shared/ui';

const Scanner = lazy(() => import('@yudiel/react-qr-scanner').then((m) => ({ default: m.Scanner })));

/** Camera QR scanner (lazy-loaded). Calls onCode once with the decoded text. */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-xl bg-sunken p-6 text-center text-sm text-muted [box-shadow:inset_0_0_0_1px_var(--line)]">
        <div>
          <CameraOff className="mx-auto mb-3 size-6 text-faint" />
          Camera isn’t available. Allow camera access in your browser, or type the code shown under the QR.
        </div>
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
      <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
        <Scanner
          onScan={(codes) => {
            const v = codes[0]?.rawValue;
            if (v) onCode(v);
          }}
          onError={() => setFailed(true)}
          formats={['qr_code']}
          components={{ finder: false }}
          styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
        />
      </Suspense>
      {/* Viewfinder */}
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      <div className="pointer-events-none absolute inset-x-[18%] h-0.5 animate-[scan_2.2s_ease-in-out_infinite] bg-accent shadow-[0_0_12px_var(--accent)]" />
    </div>
  );
}
