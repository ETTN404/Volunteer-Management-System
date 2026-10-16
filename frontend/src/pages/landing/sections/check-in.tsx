import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, MapPin, QrCode, TimerOff, X } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { Checkbox } from '@/shared/ui';
import { SectionHead, Shell } from './kit';

const W = 640;
const H = 460;
const VENUE = { x: 320, y: 230 };
const RADIUS = 110;

export function CheckInDemo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pin, setPin] = useState({ x: 380, y: 180 });
  const [dragging, setDragging] = useState(false);
  const [drift, setDrift] = useState(false);
  const [late, setLate] = useState(false);
  const [staleQr, setStaleQr] = useState(false);
  const distance = Math.hypot(pin.x - VENUE.x, pin.y - VENUE.y);
  const inside = distance <= RADIUS;

  // Same order as AttendanceController::checkIn
  const gates = [
    { key: 'clock', label: 'Phone clock within 2 minutes of the server', icon: Clock, pass: !drift, fail: 'Security Error: High time-drift detected. Ensure your device clock is synced accurately to the network.' },
    { key: 'window', label: 'Inside the check-in window', icon: TimerOff, pass: !late, fail: 'Check-in is unavailable. Check-in window is open between 07:45:00 and 08:30:00.' },
    { key: 'qr', label: 'Current QR code (rotates every 15 min)', icon: QrCode, pass: !staleQr, fail: 'Validation Failed: Scanned QR code signature is invalid or has expired.' },
    { key: 'gps', label: `Standing inside the ${RADIUS} m geofence`, icon: MapPin, pass: inside, fail: `Location Blocked: You must be present at the physical venue to check in. You are ${distance.toFixed(1)} meters away (Geofence limit: ${RADIUS} meters).` },
  ];
  const failed = gates.find((g) => !g.pass);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setPin({ x: Math.max(14, Math.min(W - 14, ((e.clientX - r.left) / r.width) * W)), y: Math.max(14, Math.min(H - 14, ((e.clientY - r.top) / r.height) * H)) });
  };

  return (
    <Shell id="check-in">
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <SectionHead
            eyebrow="Verified check-in"
            title={
              <>
                Hours that
                <br />
                actually happened.
              </>
            }
            body="A paper sign-in sheet can be filled from anywhere. VolunTrack checks four things before a single minute counts. Drag the volunteer and try to break them."
          />
          <ul className="mt-10 space-y-2.5">
            {gates.map((g) => (
              <li key={g.key} className={cn('flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-colors duration-300 [box-shadow:inset_0_0_0_1px_var(--line)]', g.pass ? 'bg-surface' : 'bg-danger-soft')}>
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-full transition-colors', g.pass ? 'bg-success text-white' : 'bg-danger text-white')}>
                  {g.pass ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                </span>
                <g.icon className="size-4 shrink-0 text-faint" />
                <span className="text-[14.5px] font-medium text-text">{g.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Checkbox label="Phone clock is 5 min off" checked={drift} onCheckedChange={(v) => setDrift(v === true)} />
            <Checkbox label="Arrived 40 min late" checked={late} onCheckedChange={(v) => setLate(v === true)} />
            <Checkbox label="Old QR screenshot" checked={staleQr} onCheckedChange={(v) => setStaleQr(v === true)} />
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[32px] bg-surface [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)]" style={{ aspectRatio: `${W} / ${H}` }}>
            <div className="bg-grid absolute inset-0" />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className={cn('absolute inset-0 size-full touch-none select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
              onPointerMove={move}
              onPointerUp={() => setDragging(false)}
              onPointerLeave={() => setDragging(false)}
              onPointerDown={(e) => {
                setDragging(true);
                (e.target as Element).setPointerCapture?.(e.pointerId);
                move(e);
              }}
              role="application"
              aria-label="Drag the volunteer marker to test the geofence"
            >
              {/* stylised streets */}
              <g stroke="var(--line-strong)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.55">
                <path d="M-20 300 C 160 260, 300 340, 660 280" />
                <path d="M200 -20 C 240 140, 180 300, 260 480" />
                <path d="M470 -20 C 430 160, 520 300, 470 480" />
              </g>
              <circle cx={VENUE.x} cy={VENUE.y} r={RADIUS} fill={inside ? 'color-mix(in oklab, var(--success) 12%, transparent)' : 'color-mix(in oklab, var(--accent) 7%, transparent)'} className="transition-[fill] duration-300" />
              <circle cx={VENUE.x} cy={VENUE.y} r={RADIUS} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 8" className="motion-safe:animate-[spin_40s_linear_infinite]" style={{ transformOrigin: `${VENUE.x}px ${VENUE.y}px` }} />
              <circle cx={VENUE.x} cy={VENUE.y} r="7" fill="var(--accent)" stroke="var(--surface)" strokeWidth="3" />
              <text x={VENUE.x} y={VENUE.y + 28} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text-muted)">
                Meskel Square
              </text>
              <line x1={VENUE.x} y1={VENUE.y} x2={pin.x} y2={pin.y} stroke={inside ? 'var(--success)' : 'var(--danger)'} strokeWidth="1.6" strokeDasharray="3 5" />
              <g transform={`translate(${(VENUE.x + pin.x) / 2} ${(VENUE.y + pin.y) / 2 - 14})`}>
                <rect x="-30" y="-13" width="60" height="24" rx="12" fill="var(--surface)" stroke="var(--line)" />
                <text textAnchor="middle" y="4" fontSize="12" fontWeight="700" fill={inside ? 'var(--success-text)' : 'var(--danger-text)'}>
                  {Math.round(distance)} m
                </text>
              </g>
              <g transform={`translate(${pin.x} ${pin.y})`}>
                <circle r="20" fill={inside ? 'var(--success)' : 'var(--danger)'} opacity="0.16">
                  <animate attributeName="r" values="14;26;14" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle r="10" fill={inside ? 'var(--success)' : 'var(--danger)'} stroke="var(--surface)" strokeWidth="4" />
              </g>
            </svg>
            <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-surface/90 px-3 py-1.5 text-[12px] font-semibold text-muted backdrop-blur [box-shadow:inset_0_0_0_1px_var(--line)]">Drag the volunteer</div>
          </div>
          <div className="relative z-10 mx-6 -mt-6 rounded-2xl bg-[#0b1f1a] p-4 font-mono text-[12px] leading-relaxed text-white/80 shadow-2xl sm:mx-10" aria-live="polite">
            <div className="text-white/60">POST /api/volunteer/check-in</div>
            <AnimatePresence mode="wait">
              <motion.div key={failed?.key ?? 'ok'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {failed ? <span className="text-[#ff9b8a]">422 · {failed.fail}</span> : <span className="text-[#7fe0b9]">201 · Check-in verified successfully. Welcome to your shift!</span>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Shell>
  );
}
