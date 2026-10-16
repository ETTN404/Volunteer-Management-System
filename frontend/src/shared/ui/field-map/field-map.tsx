import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { fbm } from './noise';

export interface FieldVenue {
  id: string | number;
  /** Normalized position 0–1 within the canvas. */
  x: number;
  y: number;
  /** Geofence radius in CSS px at 1440px wide (scaled responsively). */
  radius: number;
  label?: string;
}

export interface FieldPing {
  venueId: FieldVenue['id'];
  inside: boolean;
  at: number;
}

interface Props {
  venues: FieldVenue[];
  className?: string;
  /** Average ms between simulated check-ins (0 disables). */
  pingEvery?: number;
  /** Contour cell size in px; larger = cheaper. */
  cell?: number;
  onPing?: (ping: FieldPing) => void;
  /** Static pings to render (e.g. real check-ins). */
  intensity?: 'full' | 'calm';
  showLabels?: boolean;
}

interface LivePing {
  x: number;
  y: number;
  inside: boolean;
  born: number;
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    contour: v('--map-contour') || 'rgba(157,180,176,0.12)',
    contourStrong: v('--map-contour-strong') || 'rgba(157,180,176,0.24)',
    accent: v('--accent') || '#ffb238',
    success: v('--success') || '#5ee6b5',
    danger: v('--danger') || '#ff5a4e',
    text: v('--text-muted') || '#9db4b0',
  };
}

/**
 * Live Field Map — VolunTrack's signature surface. A drifting topographic contour field with
 * geofence rings where volunteer check-ins ping in. Pauses offscreen; static under reduced motion.
 */
export function FieldMap({ venues, className, pingEvery = 1400, cell = 16, onPing, intensity = 'full', showLabels = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const onPingRef = useRef(onPing);
  onPingRef.current = onPing;
  const venuesRef = useRef(venues);
  venuesRef.current = venues;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let colors = readColors();
    const themeObserver = new MutationObserver(() => (colors = readColors()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

    let w = 0;
    let h = 0;
    let dpr = 1;
    let scale = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      scale = Math.max(0.55, Math.min(1.2, w / 1440));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pings: LivePing[] = [];
    let nextPing = performance.now() + 600;
    let running = true;
    let visible = true;
    let raf = 0;
    let last = 0;
    const levels = intensity === 'calm' ? 7 : 10;
    const zoom = 0.0042;

    const drawContours = (t: number) => {
      const cols = Math.ceil(w / cell) + 1;
      const rows = Math.ceil(h / cell) + 1;
      const field = new Float32Array(cols * rows);
      const z = t * 0.000035;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          field[j * cols + i] = fbm(i * cell * zoom + 3.7, j * cell * zoom + 1.9, z);
        }
      }
      for (let l = 1; l < levels; l++) {
        const iso = 0.18 + (l / levels) * 0.66;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i]!;
            const b = field[j * cols + i + 1]!;
            const c = field[(j + 1) * cols + i + 1]!;
            const d = field[(j + 1) * cols + i]!;
            const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x = i * cell;
            const y = j * cell;
            const top = [x + cell * ((iso - a) / (b - a)), y] as const;
            const right = [x + cell, y + cell * ((iso - b) / (c - b))] as const;
            const bottom = [x + cell * ((iso - d) / (c - d)), y + cell] as const;
            const left = [x, y + cell * ((iso - a) / (d - a))] as const;
            const seg = (p: readonly [number, number], q: readonly [number, number]) => {
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(q[0], q[1]);
            };
            switch (idx) {
              case 1: case 14: seg(left, bottom); break;
              case 2: case 13: seg(bottom, right); break;
              case 3: case 12: seg(left, right); break;
              case 4: case 11: seg(top, right); break;
              case 5: seg(left, top); seg(bottom, right); break;
              case 6: case 9: seg(top, bottom); break;
              case 7: case 8: seg(left, top); break;
              case 10: seg(left, bottom); seg(top, right); break;
            }
          }
        }
        ctx.strokeStyle = l % 3 === 0 ? colors.contourStrong : colors.contour;
        ctx.lineWidth = l % 3 === 0 ? 1.1 : 0.8;
        ctx.stroke();
      }
    };

    const drawVenues = (t: number) => {
      for (const v of venuesRef.current) {
        const cx = v.x * w;
        const cy = v.y * h;
        const r = v.radius * scale;
        // Geofence halo
        const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.15);
        g.addColorStop(0, hexA(colors.accent, 0.1));
        g.addColorStop(1, hexA(colors.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
        ctx.fill();
        // Dashed boundary, slowly rotating
        ctx.save();
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -t * 0.006;
        ctx.strokeStyle = hexA(colors.accent, 0.85);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Inner ring + center
        ctx.strokeStyle = hexA(colors.accent, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        // Crosshair ticks
        ctx.strokeStyle = hexA(colors.accent, 0.6);
        ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          ctx.moveTo(cx + dx * (r - 5), cy + dy * (r - 5));
          ctx.lineTo(cx + dx * (r + 5), cy + dy * (r + 5));
        }
        ctx.stroke();
        if (showLabels && v.label) {
          ctx.font = `500 ${Math.round(10.5 * Math.max(scale, 0.85))}px "Geist Mono Variable", ui-monospace, monospace`;
          ctx.fillStyle = colors.text;
          ctx.textAlign = 'left';
          ctx.fillText(v.label.toUpperCase(), cx + r + 10, cy + 3);
        }
      }
    };

    const spawn = (now: number, notify = true) => {
      const vs = venuesRef.current;
      if (!vs.length) return;
      const v = vs[Math.floor(Math.random() * vs.length)]!;
      const inside = Math.random() > 0.12;
      const r = v.radius * scale;
      const ang = Math.random() * Math.PI * 2;
      const dist = inside ? Math.sqrt(Math.random()) * r * 0.9 : r * (1.25 + Math.random() * 0.6);
      pings.push({ x: v.x * w + Math.cos(ang) * dist, y: v.y * h + Math.sin(ang) * dist, inside, born: now });
      if (pings.length > 60) pings.shift();
      if (notify) onPingRef.current?.({ venueId: v.id, inside, at: Date.now() });
    };

    const drawPings = (now: number) => {
      for (const p of pings) {
        const age = (now - p.born) / 1000;
        const col = p.inside ? colors.success : colors.danger;
        if (age < 1.6) {
          const k = age / 1.6;
          ctx.strokeStyle = hexA(col, 0.9 * (1 - k));
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 + k * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
        const fade = p.inside ? Math.max(0.35, 1 - age / 40) : Math.max(0, 1 - age / 4);
        if (fade <= 0) continue;
        ctx.fillStyle = hexA(col, fade);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.inside ? 2.6 : 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (!p.inside && age < 4) {
          ctx.strokeStyle = hexA(col, fade * 0.8);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y - 4);
          ctx.lineTo(p.x + 4, p.y + 4);
          ctx.moveTo(p.x + 4, p.y - 4);
          ctx.lineTo(p.x - 4, p.y + 4);
          ctx.stroke();
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!running || !visible) return;
      if (now - last < 1000 / 30) return; // 30 fps budget
      last = now;
      ctx.clearRect(0, 0, w, h);
      drawContours(now);
      drawVenues(now);
      if (pingEvery > 0 && now > nextPing) {
        spawn(now);
        nextPing = now + pingEvery * (0.4 + Math.random() * 1.2);
      }
      drawPings(now);
    };

    if (reduce) {
      ctx.clearRect(0, 0, w, h);
      drawContours(0);
      drawVenues(0);
    } else {
      // Seed a few existing check-ins so the map never starts empty.
      for (let i = 0; i < 9; i++) spawn(performance.now() - 2000 - i * 900, false);
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => (visible = Boolean(entry?.isIntersecting)));
    io.observe(canvas);
    const onVis = () => (running = document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce, pingEvery, cell, intensity, showLabels]);

  return <canvas ref={canvasRef} aria-hidden className={cn('block h-full w-full', className)} />;
}

/** Apply alpha to a #rrggbb color (falls back to the input for other formats). */
function hexA(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}
