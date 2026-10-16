/** Tenant brand color helpers (G20). */

export function isHex(v: string | null | undefined): v is string {
  return Boolean(v && /^#[0-9a-f]{6}$/i.test(v));
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Readable text color for a fill. */
export function onColor(hex: string): string {
  return contrast(hex, '#1f1400') >= contrast(hex, '#ffffff') ? '#1f1400' : '#ffffff';
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const VARS = ['--accent', '--accent-fg', '--accent-soft', '--accent-strong', '--accent-text', '--focus'] as const;

/** Apply (or clear) an organization's brand color as the workspace accent. */
export function applyBrand(hex: string | null | undefined, theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (!isHex(hex)) {
    VARS.forEach((v) => root.style.removeProperty(v));
    return;
  }
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-fg', onColor(hex));
  root.style.setProperty('--accent-soft', withAlpha(hex, theme === 'dark' ? 0.14 : 0.14));
  // Text on surfaces must stay legible: fall back to theme text when the brand color is too faint.
  const surface = theme === 'dark' ? '#0b2225' : '#ffffff';
  const legible = contrast(hex, surface) >= 4.5 ? hex : theme === 'dark' ? '#e8f1ee' : '#0c2426';
  root.style.setProperty('--accent-text', legible);
  root.style.setProperty('--accent-strong', contrast(hex, surface) >= 3 ? hex : legible);
  root.style.setProperty('--focus', theme === 'dark' ? hex : legible);
}

export const BRAND_SWATCHES = ['#FFB238', '#E5483D', '#1FBF86', '#2F8FD8', '#8B5CF6', '#EC4899', '#0EA5A4', '#F97316'];
