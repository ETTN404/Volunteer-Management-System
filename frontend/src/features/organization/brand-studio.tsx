import { Check, ExternalLink, Monitor, Smartphone, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { contrast, isHex, onColor } from '@/shared/lib/color';
import { Segmented } from '@/shared/ui';

/** Named palettes — one tap sets the organization colour. */
export const PALETTES: { name: string; mood: string; color: string; glow: string }[] = [
  { name: 'Abay', mood: 'Deep and trusted', color: '#3341B8', glow: '#F2A93B' },
  { name: 'Blue Nile', mood: 'Calm and clear', color: '#1E5AA8', glow: '#E7B13C' },
  { name: 'Simien', mood: 'Fresh and outdoors', color: '#1F7A4D', glow: '#E9C34A' },
  { name: 'Lalibela', mood: 'Warm and rooted', color: '#8B4A2B', glow: '#1E6E7A' },
  { name: 'Meskel', mood: 'Bold and caring', color: '#C8372D', glow: '#F2A93B' },
  { name: 'Tana', mood: 'Steady and kind', color: '#0E7C86', glow: '#F08A5D' },
  { name: 'Buna', mood: 'Grounded, like coffee', color: '#6B4226', glow: '#D9A066' },
  { name: 'Danakil', mood: 'Bright and energetic', color: '#C4641C', glow: '#2B4C9B' },
];

export function PaletteGrid({ value, onPick, disabled }: { value?: string | null; onPick: (hex: string) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PALETTES.map((p) => {
        const on = value?.toLowerCase() === p.color.toLowerCase();
        return (
          <button
            key={p.name}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p.color)}
            aria-pressed={on}
            className={cn(
              'group relative overflow-hidden rounded-[16px] bg-surface text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50',
              on ? '[box-shadow:0_10px_24px_-14px_rgba(17,21,43,0.4),inset_0_0_0_2px_var(--text)]' : '[box-shadow:0_1px_2px_rgba(17,21,43,0.04),inset_0_0_0_1px_var(--line)] hover:[box-shadow:0_10px_24px_-16px_rgba(17,21,43,0.35),inset_0_0_0_1px_var(--line-strong)]',
            )}
          >
            <span className="block h-3" style={{ background: p.color }} />
            <span className="relative block px-3 pb-3 pt-2.5" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${p.color} 7%, white), white 70%)` }}>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-12 rounded-full bg-line-strong/70" />
                <span className="ml-auto size-2 rounded-full" style={{ background: p.glow }} />
              </span>
              <span className="mt-1.5 block h-1.5 w-20 rounded-full bg-line" />
              <span className="mt-2.5 block h-4 w-14 rounded-md" style={{ background: p.color }} />
            </span>
            <span className="block border-t border-line px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-text">
                {p.name}
                {on && <Check className="size-3.5 text-success" strokeWidth={3} />}
              </span>
              <span className="block truncate text-[12px] text-muted">{p.mood}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** "Reads well" check: is the button text legible on this colour? */
export function ContrastCheck({ color }: { color: string }) {
  const fg = onColor(color);
  const ratio = contrast(color, fg);
  const ok = ratio >= 4.5;
  return (
    <div className="flex items-center gap-4 rounded-[16px] bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)]">
      <span className="inline-flex h-10 shrink-0 items-center rounded-full px-5 text-[13.5px] font-semibold shadow-md" style={{ background: color, color: fg }}>
        Apply now
      </span>
      <p className={cn('flex items-start gap-1.5 text-[13px]', ok ? 'text-muted' : 'text-warning-text')}>
        {ok ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
        {ok
          ? `Reads well: ${fg === '#ffffff' ? 'white' : 'dark'} text on your buttons, emails and receipts.`
          : `Hard to read (contrast ${ratio.toFixed(1)}:1). Pick a deeper shade so buttons stay legible.`}
      </p>
    </div>
  );
}

/** Live preview of the organization's public page, in a desktop or phone frame. */
export function PublicPagePreview({ orgId, color }: { orgId: number; color?: string | null }) {
  const [device, setDevice] = useState<'desktop' | 'phone'>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'phone' : 'desktop'));
  const [src, setSrc] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  // Scale the frame to the space available, so it never overflows a phone screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRoom(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Debounce colour changes so the frame doesn't reload on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setSrc(`/orgs/${orgId}?embed=1${isHex(color) ? `&preview_color=${encodeURIComponent(color)}` : ''}`), 350);
    return () => window.clearTimeout(id);
  }, [orgId, color]);

  const base = device === 'desktop' ? { w: 1280, h: 860, max: 0.36 } : { w: 390, h: 800, max: 0.52 };
  const scale = room ? Math.min(base.max, (room - (device === 'phone' ? 12 : 2)) / base.w) : base.max;
  const frame = { w: base.w, h: base.h, scale };
  return (
    <div className="min-w-0 overflow-hidden rounded-[22px] bg-surface [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3 sm:px-4">
        <Segmented
          size="sm"
          value={device}
          onValueChange={setDevice}
          aria-label="Preview device"
          options={[
            { value: 'desktop', label: 'Desktop', icon: <Monitor /> },
            { value: 'phone', label: 'Phone', icon: <Smartphone /> },
          ]}
        />
        <a href={`/orgs/${orgId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline">
          Open live page <ExternalLink className="size-3.5" />
        </a>
      </div>
      <div ref={stage} className="bg-contours grid place-items-center overflow-hidden bg-sunken px-3 py-5 sm:px-4 sm:py-6">
        <div
          className={cn('overflow-hidden bg-white shadow-2xl', device === 'phone' ? 'rounded-[28px] ring-[6px] ring-[#11152b]' : 'rounded-[12px] ring-1 ring-line')}
          style={{ width: frame.w * frame.scale, height: frame.h * frame.scale }}
        >
          {device === 'desktop' && (
            <div className="flex h-5 items-center gap-1 bg-surface-2 px-2">
              <span className="size-1.5 rounded-full bg-[#ff5f57]" />
              <span className="size-1.5 rounded-full bg-[#febc2e]" />
              <span className="size-1.5 rounded-full bg-[#28c840]" />
            </div>
          )}
          {src && (
            <iframe
              key={device}
              title="Public page preview"
              src={src}
              className="pointer-events-none origin-top-left border-0"
              style={{ width: frame.w, height: frame.h, transform: `scale(${frame.scale})` }}
              tabIndex={-1}
            />
          )}
        </div>
      </div>
    </div>
  );
}
