import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

/** Petal ring geometry shared by the mark and the large ornament (Adey Abeba, the Meskel daisy). */
function petals(count: number, cx: number, cy: number, inner: number, outer: number, width: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * outer;
    const y2 = cy + Math.sin(a) * outer;
    const nx = -Math.sin(a) * width;
    const ny = Math.cos(a) * width;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} Q${(mx + nx).toFixed(2)},${(my + ny).toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} Q${(mx - nx).toFixed(2)},${(my - ny).toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}Z`;
  }).join(' ');
}

const MARK_PETALS = petals(10, 16, 16, 5.2, 12.2, 2.7);

/** Forest tile with a white daisy and a gold heart. */
export function LogoMark({ className }: { className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4655d6" />
          <stop offset="1" stopColor="#252f8f" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#lg-${id})`} />
      <path d={MARK_PETALS} fill="#ffffff" opacity="0.96" />
      <circle cx="16" cy="16" r="4.2" fill="#f2a93b" />
      <circle cx="16" cy="16" r="1.6" fill="#e2614a" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[17px] font-bold leading-none tracking-[-0.03em] text-text" style={{ fontFamily: 'var(--font-display)' }}>
          Volun<span className="text-accent-text">Track</span>
        </span>
      )}
    </span>
  );
}

/**
 * Large decorative daisy — concentric petal rings with orbiting seeds. Rotates slowly unless reduced motion.
 * `tone` picks a palette tuned for light or dark backdrops.
 */
export function DaisyOrnament({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const stroke = tone === 'dark' ? 'rgba(200, 206, 235,0.16)' : 'rgba(51, 65, 184,0.13)';
  const strong = tone === 'dark' ? 'rgba(200, 206, 235,0.28)' : 'rgba(51, 65, 184,0.22)';
  const seed = tone === 'dark' ? '#f5b955' : '#f2a93b';
  return (
    <svg viewBox="0 0 600 600" className={cn('pointer-events-none', className)} aria-hidden>
      <g className="origin-center motion-safe:animate-[spin_120s_linear_infinite]" style={{ transformOrigin: '300px 300px' }}>
        <circle cx="300" cy="300" r="290" fill="none" stroke={stroke} strokeWidth="1" />
        <circle cx="300" cy="300" r="270" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 10" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const r1 = 270;
          const r2 = i % 6 === 0 ? 252 : 262;
          return <line key={i} x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1} x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2} stroke={strong} strokeWidth="1" />;
        })}
        <path d={petals(24, 300, 300, 120, 236, 22)} fill="none" stroke={strong} strokeWidth="1.2" />
        <path d={petals(12, 300, 300, 62, 150, 26)} fill="none" stroke={stroke} strokeWidth="1.2" />
        <circle cx="300" cy="300" r="56" fill="none" stroke={strong} strokeWidth="1.2" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
          return <circle key={i} cx={300 + Math.cos(a) * 196} cy={300 + Math.sin(a) * 196} r={i % 3 === 0 ? 6 : 4} fill={seed} opacity={i % 3 === 0 ? 0.9 : 0.55} />;
        })}
      </g>
      <circle cx="300" cy="300" r="20" fill={seed} opacity="0.85" />
    </svg>
  );
}
