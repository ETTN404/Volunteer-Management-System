import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Embossed seal with the milestone hours — used on certificates, verification and celebrations.
 * Outer ring of text is a textPath so it scales crisply.
 */
export function CertificateSeal({ hours, size = 120, className, muted }: { hours: number; size?: number; className?: string; muted?: boolean }) {
  const id = useId().replace(/:/g, '');
  const color = muted ? 'var(--text-faint)' : 'var(--accent)';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={cn('shrink-0', className)} role="img" aria-label={`${hours} hour certificate seal`}>
      <defs>
        <path id={`seal-${id}`} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
      <circle cx="60" cy="60" r="52" fill={muted ? 'var(--surface-2)' : 'var(--accent-soft)'} stroke={color} strokeWidth="1.5" />
      <text fontSize="7.4" letterSpacing="2.6" fill={color} fontFamily="var(--font-mono)" fontWeight="600">
        <textPath href={`#seal-${id}`}>VOLUNTRACK · VERIFIED SERVICE · VOLUNTRACK · VERIFIED ·</textPath>
      </text>
      <circle cx="60" cy="60" r="34" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      <text x="60" y="64" textAnchor="middle" fontSize={hours >= 100 ? 24 : 28} fill={muted ? 'var(--text-muted)' : 'var(--text)'} style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>
        {hours}
      </text>
      <text x="60" y="78" textAnchor="middle" fontSize="7" letterSpacing="2" fill={muted ? 'var(--text-faint)' : 'var(--text-muted)'} fontFamily="var(--font-mono)">
        HOURS
      </text>
    </svg>
  );
}
