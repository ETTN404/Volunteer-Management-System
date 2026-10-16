import { Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';

/** Pointer-drawn signature → PNG data URL (ForceCheckInRequest.signature_data). */
export function SignaturePad({ onChange, className }: { onChange: (dataUrl: string | null) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8f1ee';
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clear = () => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <canvas
          ref={ref}
          className="h-40 w-full touch-none rounded-lg bg-sunken [box-shadow:inset_0_0_0_1px_var(--line)]"
          aria-label="Signature pad — draw with your finger or mouse"
          onPointerDown={(e) => {
            drawing.current = true;
            last.current = point(e);
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = ref.current?.getContext('2d');
            const p = point(e);
            if (ctx && last.current) {
              ctx.beginPath();
              ctx.moveTo(last.current.x, last.current.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
            last.current = p;
            if (empty) setEmpty(false);
          }}
          onPointerUp={() => {
            drawing.current = false;
            if (!empty && ref.current) onChange(ref.current.toDataURL('image/png'));
          }}
        />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-faint">Sign here</span>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-line-strong" />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="xs" onClick={clear} disabled={empty}>
          <Eraser /> Clear
        </Button>
      </div>
    </div>
  );
}
