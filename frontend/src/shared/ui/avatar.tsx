import { Avatar as AvatarPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import { initials } from '@/shared/lib/format';

// Deterministic hue from the name so each person keeps their color everywhere.
const HUES = [28, 160, 200, 340, 260, 95, 12, 185];
function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

const sizes = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-[13px]',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
} as const;

export function Avatar({
  name,
  src,
  size = 'md',
  className,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  const hue = hueFor(name);
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        sizes[size],
        ring && 'ring-2 ring-bg',
        className,
      )}
      style={{
        background: `oklch(0.42 0.09 ${hue})`,
        color: `oklch(0.95 0.04 ${hue})`,
      }}
    >
      {src && <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={src ? 400 : 0} className="tracking-wide">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function AvatarStack({ names, max = 4, size = 'sm' }: { names: string[]; max?: number; size?: keyof typeof sizes }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} ring />
      ))}
      {rest > 0 && (
        <span className={cn('relative inline-flex items-center justify-center rounded-full bg-surface-2 font-semibold text-muted ring-2 ring-bg', sizes[size])}>
          +{rest}
        </span>
      )}
    </div>
  );
}
