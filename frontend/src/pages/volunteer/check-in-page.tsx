import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Crosshair, Keyboard, LocateFixed, MapPinOff, QrCode, ScanLine, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { checkGeofence, formatDistance, offsetMeters } from '@/shared/lib/geo';
import { checkInWindow, formatTime, formatTimeRange } from '@/shared/lib/time';
import { env } from '@/shared/config/env';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useNow } from '@/shared/hooks/use-now';
import { isApiError } from '@/shared/api/http';
import { Badge, Button, Card, EmptyState, Input, InlineAlert, Segmented, Skeleton, VenueMap } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { useCheckIn } from '@/features/volunteer/api';
import { useMyShifts } from '@/features/volunteer/derived';
import { explainCheckInError } from '@/features/volunteer/check-in-errors';
import { QrScanner } from '@/features/volunteer/components/qr-scanner';

/** Demo seed QR (mock backend only) so the flow can be tried without a coordinator screen. */
const MOCK_QR = 'VT-DEMO-7F3A9C21';

function StepHeader({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors', done ? 'bg-success text-[#03241a]' : active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-faint')}>
        {done ? <Check className="size-3.5" strokeWidth={3.5} /> : n}
      </span>
      <h2 className={cn('type-title text-[16px]', active || done ? 'text-text' : 'text-faint')}>{title}</h2>
    </div>
  );
}

export default function CheckInPage() {
  const shiftId = Number(useParams().shiftId);
  const navigate = useNavigate();
  const { rows, isLoading } = useMyShifts();
  const target = rows.find((r) => r.shift.id === shiftId);
  const geo = useGeolocation();
  const [simulated, setSimulated] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mode, setMode] = useState<'scan' | 'type'>('scan');
  const [code, setCode] = useState('');
  const [doneAt, setDoneAt] = useState<Date | null>(null);
  const checkIn = useCheckIn();
  const now = useNow(5000);

  useEffect(() => {
    document.title = 'Check in · VolunTrack';
  }, []);

  const venue = target && target.event.coordinates.latitude != null ? { latitude: target.event.coordinates.latitude, longitude: target.event.coordinates.longitude! } : null;
  const position = simulated ?? (geo.status === 'ready' ? { latitude: geo.latitude!, longitude: geo.longitude! } : null);
  const fence = useMemo(() => (venue && position ? checkGeofence(position, venue, target!.event.geofence_radius) : null), [venue, position, target]);
  const locationOk = !venue || Boolean(fence?.inside);
  const w = target ? checkInWindow(target.shift.start_time, now) : null;

  if (isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (!target) {
    return (
      <EmptyState
        icon={<MapPinOff />}
        title="This shift isn’t on your schedule"
        description="You can only check in to shifts you’re confirmed for."
        action={
          <Button asChild>
            <Link to="/v/schedule">Open my schedule</Link>
          </Button>
        }
      />
    );
  }

  const submit = (qr: string) => {
    if (!position && venue) return;
    checkIn.mutate(
      {
        shift_id: shiftId,
        qr_code_signature: qr.trim(),
        latitude: position?.latitude ?? 0,
        longitude: position?.longitude ?? 0,
        client_timestamp: new Date().toISOString(),
      },
      { onSuccess: () => setDoneAt(new Date()) },
    );
  };

  const guidance = checkIn.error && isApiError(checkIn.error) ? explainCheckInError(checkIn.error) : null;

  if (doneAt) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="relative mx-auto grid size-36 place-items-center">
          <motion.span className="absolute inset-0 rounded-full border-2 border-dashed border-success" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
          <motion.span className="absolute inset-0 rounded-full bg-success/20" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.4, repeat: 2 }} />
          <span className="grid size-24 place-items-center rounded-full bg-success text-[#03241a]">
            <Check className="size-12" strokeWidth={3} />
          </span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT_EXPO }}>
          <h1 className="type-headline mt-8 text-[32px] text-text">You’re checked in</h1>
          <p className="mt-2 text-[15px] text-muted">
            {target.event.title} · {formatTime(doneAt)}
            {fence && ` · ${formatDistance(fence.distance)} from the venue`}
          </p>
          <p className="mt-6 text-sm text-muted">Check out from the green bar at the top when your shift ends — your hours are counted from now.</p>
          <Button size="lg" className="mt-8" onClick={() => navigate('/v')}>
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Link to="/v/schedule" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> My schedule
      </Link>
      <div className="mb-8">
        <p className="type-eyebrow mb-3">Check in</p>
        <h1 className="type-headline text-[clamp(1.7rem,3.4vw,2.4rem)] text-text">{target.event.title}</h1>
        <p className="mt-2 text-[15px] text-muted">
          {formatTimeRange(target.shift.start_time, target.shift.end_time)} · {target.event.location}
        </p>
        {w?.state !== 'open' && (
          <InlineAlert tone="warning" className="mt-5">
            {w?.state === 'early' ? `Check-in opens at ${formatTime(w.opensAt)}.` : 'The check-in window for this shift has closed. Ask your coordinator for a manual check-in.'}
          </InlineAlert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1 — location */}
        <Card className="p-5 sm:p-6">
          <StepHeader n={1} title="Confirm you’re at the venue" done={Boolean(position) && locationOk} active={!position || !locationOk} />
          <div className="mt-5">
            {venue ? (
              <VenueMap venue={venue} radius={target.event.geofence_radius} you={position} inside={fence?.inside} className="h-[300px]" label={target.event.location.split(',')[0]} />
            ) : (
              <InlineAlert tone="info">This event has no map pin, so your location isn’t checked.</InlineAlert>
            )}
          </div>
          <div className="mt-4" aria-live="polite">
            {!position && venue && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={geo.start} loading={geo.status === 'locating'}>
                  <LocateFixed /> Share my location
                </Button>
                <p className="text-[13px] text-muted">
                  {geo.status === 'denied'
                    ? 'Location is blocked. Allow it in your browser’s site settings, then try again.'
                    : geo.status === 'unavailable' || geo.status === 'timeout'
                      ? 'Couldn’t get a GPS fix. Move outdoors or near a window and retry.'
                      : 'Used only for this check-in.'}
                </p>
              </div>
            )}
            {fence && (
              <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3', fence.inside ? 'bg-success-soft' : 'bg-danger-soft')}>
                <Crosshair className={cn('size-5 shrink-0', fence.inside ? 'text-success-text' : 'text-danger-text')} />
                <div className="text-sm">
                  <div className={cn('font-semibold', fence.inside ? 'text-success-text' : 'text-danger-text')}>
                    {fence.inside ? 'Inside the check-in area' : `${formatDistance(fence.outsideBy)} outside the check-in area`}
                  </div>
                  <div className="text-muted">
                    {formatDistance(fence.distance)} from the venue center · limit {target.event.geofence_radius} m
                    {geo.accuracy && !simulated ? ` · GPS ±${Math.round(geo.accuracy)} m` : ''}
                  </div>
                </div>
              </div>
            )}
            {env.mockMode !== 'off' && venue && (
              <button
                type="button"
                onClick={() => setSimulated(offsetMeters(venue, 24, -18))}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-faint hover:text-muted"
              >
                <Wand2 className="size-3.5" /> Demo: place me at the venue
              </button>
            )}
          </div>
        </Card>

        {/* Step 2 — QR */}
        <Card className={cn('p-5 sm:p-6 transition-opacity', !locationOk || (!position && venue) ? 'opacity-55' : '')}>
          <div className="flex items-center justify-between gap-3">
            <StepHeader n={2} title="Scan the coordinator’s QR" done={false} active={Boolean(position) && locationOk} />
            <Segmented
              size="sm"
              value={mode}
              onValueChange={setMode}
              aria-label="QR input"
              options={[
                { value: 'scan', label: 'Scan', icon: <ScanLine /> },
                { value: 'type', label: 'Type', icon: <Keyboard /> },
              ]}
            />
          </div>
          <div className="mt-5">
            <AnimatePresence mode="wait">
              {mode === 'scan' ? (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-[320px]">
                  {position || !venue ? (
                    <QrScanner onCode={(c) => !checkIn.isPending && submit(c)} />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl bg-sunken text-center text-sm text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
                      <div>
                        <QrCode className="mx-auto mb-2 size-7" />
                        Share your location first
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key="type"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(code);
                  }}
                  className="space-y-3"
                >
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code shown under the QR" className="type-data" aria-label="QR code" inputSize="lg" />
                  <Button type="submit" className="w-full" size="lg" disabled={!code.trim() || (!position && Boolean(venue))} loading={checkIn.isPending}>
                    Check in
                  </Button>
                  {env.mockMode !== 'off' && (
                    <button type="button" onClick={() => setCode(MOCK_QR)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-faint hover:text-muted">
                      <Wand2 className="size-3.5" /> Demo: use today’s blood-drive code
                    </button>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          {checkIn.isPending && (
            <div className="mt-4 flex justify-center">
              <Badge tone="info" dot pulse>
                Verifying location, code and clock…
              </Badge>
            </div>
          )}
          {guidance && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-lg bg-danger-soft p-4" role="alert">
              <div className="text-[14.5px] font-semibold text-danger-text">{guidance.title}</div>
              <p className="mt-1 text-sm text-text/85">{guidance.fix}</p>
              <p className="type-data mt-2.5 text-[11px] text-faint">{guidance.detail}</p>
            </motion.div>
          )}
        </Card>
      </div>
    </>
  );
}
