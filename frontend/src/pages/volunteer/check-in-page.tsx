import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, CheckCircle2, Crosshair, Keyboard, LocateFixed, LogOut, MapPinOff, QrCode, RotateCcw, ScanLine, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { checkGeofence, formatDistance, offsetMeters } from '@/shared/lib/geo';
import { formatTime, formatTimeRange } from '@/shared/lib/time';
import { formatHours } from '@/shared/lib/format';
import { env } from '@/shared/config/env';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useNow } from '@/shared/hooks/use-now';
import { errorMessage, isApiError } from '@/shared/api/http';
import { Badge, Button, Card, EmptyState, Input, InlineAlert, Segmented, Skeleton, VenueMap, notify } from '@/shared/ui';
import { EASE_OUT_EXPO } from '@/shared/motion';
import type { CheckOutResult } from '@/shared/types/api';
import { useCheckIn, useResumeShift } from '@/features/volunteer/api';
import { shiftPhase, useMyShifts } from '@/features/volunteer/derived';
import { explainCheckInError } from '@/features/volunteer/check-in-errors';
import { QrScanner } from '@/features/volunteer/components/qr-scanner';
import { CheckOutDialog, CheckOutResultDialog } from '@/features/volunteer/components/check-out-flow';
import { useT } from '@/shared/i18n';

/** Demo seed QR (mock backend only) so the flow can be tried without a coordinator screen. */
const MOCK_QR = 'VT-DEMO-7F3A9C21';

function StepHeader({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors', done ? 'bg-success text-white' : active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-faint')}>
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [result, setResult] = useState<CheckOutResult | null>(null);
  const checkIn = useCheckIn();
  const resume = useResumeShift();
  const now = useNow(5000);
  const t = useT();

  useEffect(() => {
    document.title = `${t('Check in')} · VolunTrack`;
  }, [t]);

  const venue = target && target.event.coordinates.latitude != null ? { latitude: target.event.coordinates.latitude, longitude: target.event.coordinates.longitude! } : null;
  const position = simulated ?? (geo.status === 'ready' ? { latitude: geo.latitude!, longitude: geo.longitude! } : null);
  const accuracy = simulated ? 8 : geo.accuracy ?? null;
  const fence = useMemo(() => (venue && position ? checkGeofence(position, venue, target!.event.geofence_radius) : null), [venue, position, target]);
  const weak = accuracy != null && accuracy > Math.max(150, target?.event.geofence_radius ?? 100);
  const locationOk = !venue || (Boolean(fence?.inside) && !weak);

  if (isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (!target) {
    return (
      <EmptyState
        icon={<MapPinOff />}
        title={t('This shift isn’t on your schedule')}
        description={t('You can only check in to shifts you’re confirmed for.')}
        action={
          <Button asChild>
            <Link to="/v/schedule">{t('Open my schedule')}</Link>
          </Button>
        }
      />
    );
  }

  const phase = shiftPhase(target, now);

  const submit = (qr: string) => {
    if (!position && venue) return;
    checkIn.mutate(
      {
        shift_id: shiftId,
        qr_code_signature: qr.trim(),
        latitude: position?.latitude ?? 0,
        longitude: position?.longitude ?? 0,
        accuracy,
        client_timestamp: new Date().toISOString(),
      },
      { onSuccess: () => setDoneAt(new Date()) },
    );
  };

  const guidance = checkIn.error && isApiError(checkIn.error) ? explainCheckInError(checkIn.error) : null;

  const header = (
    <>
      <Link to="/v/schedule" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {t('My schedule')}
      </Link>
      <div className="mb-8 min-w-0">
        <p className="type-eyebrow mb-3">{phase === 'on-shift' ? t('On shift') : phase === 'checked-out' ? t('Shift finished') : t('Check in')}</p>
        <h1 className="type-headline text-[clamp(1.6rem,6vw,2.4rem)] text-text wrap-anywhere">{target.event.title}</h1>
        <p className="mt-2 text-[15px] text-muted">
          {formatTimeRange(target.shift.start_time, target.shift.end_time)} · {target.event.location}
        </p>
      </div>
    </>
  );

  if (doneAt) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="relative mx-auto grid size-36 place-items-center">
          <motion.span className="absolute inset-0 rounded-full border-2 border-dashed border-success" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
          <span className="grid size-24 place-items-center rounded-full bg-success text-white">
            <Check className="size-12" strokeWidth={3} />
          </span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT_EXPO }}>
          <h1 className="type-headline mt-8 text-[32px] text-text">{t('You’re checked in')}</h1>
          <p className="mt-2 text-[15px] text-muted">
            {target.event.title} · {formatTime(doneAt)}
            {fence && ` · ${t('{d} from the venue', { d: formatDistance(fence.distance) })}`}
          </p>
          <p className="mt-6 text-sm text-muted">{t('Keep VolunTrack open when you can — it quietly confirms you’re still at the venue. Check out from the green bar when your shift ends.')}</p>
          <Button size="lg" className="mt-8" onClick={() => navigate('/v')}>
            {t('Done')}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Already on shift → this page becomes the check-out screen.
  if (phase === 'on-shift') {
    return (
      <>
        {header}
        <Card tone="accent" className="mx-auto max-w-xl p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success-text" />
          <h2 className="type-title mt-3 text-xl text-text">{t('You checked in at {time}', { time: formatTime(target.attendance?.check_in_time) })}</h2>
          <p className="mt-2 text-sm text-muted">{t('The shift ends at {time}. Check out when you leave — leaving early asks for a reason so your coordinator can fill your place.', { time: formatTime(target.end) })}</p>
          <Button size="lg" className="mt-6 w-full sm:w-auto" variant="success" onClick={() => setCheckoutOpen(true)}>
            <LogOut /> {t('Check out')}
          </Button>
        </Card>
        <CheckOutDialog row={target} open={checkoutOpen} onOpenChange={setCheckoutOpen} onDone={setResult} />
        <CheckOutResultDialog result={result} onClose={() => setResult(null)} />
      </>
    );
  }

  if (phase === 'checked-out') {
    const a = target.attendance!;
    return (
      <>
        {header}
        <Card className="mx-auto max-w-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-success-text" />
            <h2 className="type-title text-lg text-text">
              {formatTime(a.check_in_time)} – {formatTime(a.check_out_time)} · {formatHours(a.hours ?? 0)}
            </h2>
          </div>
          <p className="mt-3 text-sm text-muted">
            {a.hours_status === 'pending'
              ? t('Your coordinator will verify these hours soon.')
              : a.hours_status === 'rejected'
                ? `${t('Your coordinator did not approve these hours.')}${a.verification_note ? ` ${t('Note:')} ${a.verification_note}` : ''}`
                : t('Verified: {h} count toward your impact.', { h: formatHours(a.verified_hours ?? 0) })}
          </p>
          {a.check_out_method === 'auto' && <InlineAlert tone="info" className="mt-4">{t('You didn’t check out, so the shift was closed at its scheduled end.')}</InlineAlert>}
          {a.can_resume && (
            <Button
              variant="secondary"
              className="mt-5"
              loading={resume.isPending}
              onClick={() => resume.mutate(target.shift.id, { onSuccess: () => notify.success(t('You’re back on shift')), onError: (e) => notify.error(errorMessage(e)) })}
            >
              <RotateCcw /> {t('I checked out by mistake — resume')}
            </Button>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      {header}
      {phase !== 'check-in-open' && (
        <InlineAlert tone="warning" className="-mt-4 mb-6">
          {phase === 'too-early'
            ? t('Check-in opens at {time}.', { time: formatTime(new Date(target.start.getTime() - 15 * 60_000)) })
            : phase === 'not-confirmed'
              ? t('You can check in once a coordinator confirms your place.')
              : t('The check-in window has closed. If you are at the venue, the coordinator can check you in by hand.')}
        </InlineAlert>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-5 sm:p-6">
          <StepHeader n={1} title={t('Confirm you’re at the venue')} done={Boolean(position) && locationOk} active={!position || !locationOk} />
          <div className="mt-5">
            {venue ? (
              <VenueMap venue={venue} radius={target.event.geofence_radius} you={position} youAccuracy={accuracy} inside={fence?.inside} className="h-[300px]" label={target.event.location.split(',')[0]} />
            ) : (
              <InlineAlert tone="info">{t('This event has no map pin, so your location isn’t checked.')}</InlineAlert>
            )}
          </div>
          <div className="mt-4" aria-live="polite">
            {!position && venue && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={geo.start} loading={geo.status === 'locating'}>
                  <LocateFixed /> {t('Share my location')}
                </Button>
                <p className="text-[13px] text-muted">
                  {geo.status === 'denied'
                    ? t('Location is blocked. Allow it in your browser’s site settings, then try again.')
                    : geo.status === 'unavailable' || geo.status === 'timeout'
                      ? t('Couldn’t get a GPS fix. Move outdoors or near a window and retry.')
                      : t('Used only to confirm you’re at the venue.')}
                </p>
              </div>
            )}
            {fence && (
              <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3', locationOk ? 'bg-success-soft' : 'bg-danger-soft')}>
                <Crosshair className={cn('size-5 shrink-0', locationOk ? 'text-success-text' : 'text-danger-text')} />
                <div className="text-sm">
                  <div className={cn('font-semibold', locationOk ? 'text-success-text' : 'text-danger-text')}>
                    {weak ? t('GPS signal too weak — step outside for a moment') : fence.inside ? t('Inside the check-in area') : t('{d} outside the check-in area', { d: formatDistance(fence.outsideBy) })}
                  </div>
                  <div className="text-muted">
                    {t('{d} from the venue', { d: formatDistance(fence.distance) })} · {t('limit {n} m', { n: target.event.geofence_radius })}{accuracy ? ` · GPS ±${Math.round(accuracy)} m` : ''}
                  </div>
                </div>
              </div>
            )}
            {env.mockMode !== 'off' && venue && (
              <button type="button" onClick={() => setSimulated(offsetMeters(venue, 24, -18))} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-faint hover:text-muted">
                <Wand2 className="size-3.5" /> {t('Demo: place me at the venue')}
              </button>
            )}
          </div>
        </Card>

        <Card className={cn('min-w-0 p-5 transition-opacity sm:p-6', !locationOk || (!position && venue) ? 'opacity-55' : '')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StepHeader n={2} title={t('Scan the coordinator’s QR')} done={false} active={Boolean(position) && locationOk} />
            <Segmented
              size="sm"
              value={mode}
              onValueChange={setMode}
              aria-label={t('QR input')}
              options={[
                { value: 'scan', label: t('Scan'), icon: <ScanLine /> },
                { value: 'type', label: t('Type'), icon: <Keyboard /> },
              ]}
            />
          </div>
          <p className="mt-3 text-[13px] text-muted">{t('The coordinator at the venue shows a QR on their phone or a screen. It changes every 30 seconds, so scan it live.')}</p>
          <div className="mt-5">
            <AnimatePresence mode="wait">
              {mode === 'scan' ? (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-[320px]">
                  {(position && locationOk) || !venue ? (
                    <QrScanner onCode={(c) => !checkIn.isPending && phase === 'check-in-open' && submit(c)} />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl bg-sunken text-center text-sm text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
                      <div>
                        <QrCode className="mx-auto mb-2 size-7" />
                        {t('Confirm your location first')}
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
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('Code shown under the QR')} className="type-code" aria-label={t('QR code')} inputSize="lg" />
                  <Button type="submit" className="w-full" size="lg" disabled={!code.trim() || !locationOk || (!position && Boolean(venue)) || phase !== 'check-in-open'} loading={checkIn.isPending}>
                    {t('Check in')}
                  </Button>
                  {env.mockMode !== 'off' && (
                    <button type="button" onClick={() => setCode(MOCK_QR)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-faint hover:text-muted">
                      <Wand2 className="size-3.5" /> {t('Demo: use today’s code')}
                    </button>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          {checkIn.isPending && (
            <div className="mt-4 flex justify-center">
              <Badge tone="info" dot pulse>
                {t('Verifying location, code and clock…')}
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
