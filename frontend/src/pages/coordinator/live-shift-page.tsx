import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Copy, Maximize2, PenLine, RefreshCw, Search, UserCheck2, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatTime, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { useNow } from '@/shared/hooks/use-now';
import type { RosterEntry } from '@/shared/types/api';
import { Avatar, Badge, Button, Card, Dialog, DialogActions, DialogContent, EmptyState, ErrorState, Field, FieldMap, InlineAlert, Input, Segmented, SignaturePad, Skeleton, Textarea, notify } from '@/shared/ui';
import { useAllOrgEvents, useForceCheckIn, useGenerateQr, useRoster } from '@/features/operations/api';
import type { QrCode } from '@/shared/types/api';

const ROTATE_BEFORE_MS = 60_000;

function useRotatingQr(shiftId: number) {
  const gen = useGenerateQr();
  const [qr, setQr] = useState<QrCode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const rotate = () =>
    gen.mutate(shiftId, {
      onSuccess: (q) => setQr(q),
      onError: (e) => notify.error(e, 'Couldn’t generate a QR code'),
    });

  useEffect(() => {
    rotate();
    return () => clearTimeout(timer.current);
  }, [shiftId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!qr) return;
    const expires = parseApiDate(qr.expires_at)?.getTime() ?? Date.now() + 15 * 60_000;
    clearTimeout(timer.current);
    timer.current = setTimeout(rotate, Math.max(5_000, expires - Date.now() - ROTATE_BEFORE_MS));
    return () => clearTimeout(timer.current);
  }, [qr]); // eslint-disable-line react-hooks/exhaustive-deps

  return { qr, rotate, rotating: gen.isPending };
}

type Filter = 'all' | 'in' | 'missing' | 'out';

function statusOf(r: RosterEntry, start: Date | null) {
  if (r.status === 'pending') return { key: 'pending', label: 'Not approved', tone: 'neutral' as const };
  if (r.attendance?.check_out_time) return { key: 'out', label: `Done · ${formatTime(r.attendance.check_out_time)}`, tone: 'info' as const };
  if (r.attendance) {
    const late = start && parseApiDate(r.attendance.check_in_time)! > new Date(start.getTime() + 5 * 60_000);
    return { key: 'in', label: `${late ? 'Late · ' : 'In · '}${formatTime(r.attendance.check_in_time)}${r.attendance.qr_verified ? '' : ' · manual'}`, tone: late ? ('warning' as const) : ('success' as const) };
  }
  return { key: 'missing', label: start && new Date() > start ? 'Not here yet' : 'Expected', tone: 'neutral' as const };
}

export default function LiveShiftPage() {
  const shiftId = Number(useParams().shiftId);
  const events = useAllOrgEvents();
  const { qr, rotate, rotating } = useRotatingQr(shiftId);
  const force = useForceCheckIn();
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [manual, setManual] = useState<RosterEntry | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [presenting, setPresenting] = useState(false);

  const found = useMemo(() => {
    for (const e of events.data ?? []) for (const s of e.shifts ?? []) if (s.id === shiftId) return { e, s };
    return null;
  }, [events.data, shiftId]);
  const start = found ? parseApiDate(found.s.start_time) : null;
  const roster = useRoster(shiftId, found?.e.id);

  useEffect(() => {
    document.title = found ? `Live · ${found.e.title}` : 'Live shift · VolunTrack';
  }, [found]);

  const rows = useMemo(() => {
    let r = (roster.data ?? []).filter((x) => x.status === 'confirmed' || x.attendance);
    if (filter !== 'all') r = r.filter((x) => statusOf(x, start).key === filter);
    if (q.trim()) r = r.filter((x) => x.volunteer.user?.full_name.toLowerCase().includes(q.trim().toLowerCase()));
    return r;
  }, [roster.data, filter, q, start]);
  const all = (roster.data ?? []).filter((x) => x.status === 'confirmed' || x.attendance);
  const inCount = all.filter((x) => x.attendance && !x.attendance.check_out_time).length;
  const expiresIn = qr ? Math.max(0, (parseApiDate(qr.expires_at)?.getTime() ?? 0) - now.getTime()) : 0;

  if (events.isLoading) return <Skeleton className="h-[600px] rounded-xl" />;
  if (!found) return <EmptyState title="Shift not found" description="It may have been deleted." action={<Button asChild><Link to="/c/live">All live shifts</Link></Button>} />;

  const qrPanel = (big: boolean) => (
    <div className={cn('flex flex-col items-center', big && 'gap-8')}>
      <div className={cn('relative rounded-2xl bg-white', big ? 'p-6' : 'p-4')}>
        <AnimatePresence mode="wait">
          {qr ? (
            <motion.div key={qr.qr_code_signature} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <QRCodeSVG value={qr.qr_code_signature} size={big ? 420 : 220} level="M" fgColor="#0c2426" title="Check-in QR code for this shift" />
            </motion.div>
          ) : (
            <Skeleton className={big ? 'size-[420px]' : 'size-[220px]'} />
          )}
        </AnimatePresence>
      </div>
      <div className={cn('mt-4 text-center', big && 'mt-0')}>
        <div className="type-data text-sm text-muted">
          Rotates in{' '}
          <span className="text-text">
            {Math.floor(expiresIn / 60_000)}:{String(Math.floor((expiresIn % 60_000) / 1000)).padStart(2, '0')}
          </span>
        </div>
        {qr && (
          <button onClick={() => navigator.clipboard.writeText(qr.qr_code_signature).then(() => notify.success('Code copied'))} className="type-data mt-1 inline-flex max-w-[260px] items-center gap-1.5 truncate text-[11px] text-faint hover:text-muted">
            <Copy className="size-3 shrink-0" /> {qr.qr_code_signature}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Link to="/c/live" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Live shifts
      </Link>

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* QR column */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative h-28 border-b border-line">
              <FieldMap venues={[{ id: 1, x: 0.8, y: 0.42, radius: 34 }]} pingEvery={inCount ? 2200 : 0} intensity="calm" cell={16} showLabels={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
              <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                <div>
                  <div className="type-eyebrow-sm">Check-in QR</div>
                  <div className="type-title text-[15px] text-text">{found.e.title}</div>
                </div>
                <Badge tone="success" dot pulse>
                  {inCount} on site
                </Badge>
              </div>
            </div>
            <div className="p-6">{qrPanel(false)}</div>
            <div className="flex gap-2 border-t border-line p-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setPresenting(true)}>
                <Maximize2 /> Show full screen
              </Button>
              <Button variant="ghost" size="sm" onClick={rotate} loading={rotating}>
                <RefreshCw /> New code
              </Button>
            </div>
          </Card>
          <p className="px-1 text-[12.5px] text-faint">
            Volunteers scan this from inside the {found.e.geofence_radius} m geofence. Screenshots stop working when the code rotates.
          </p>
        </div>

        {/* Roster column */}
        <Card className="min-w-0">
          <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center">
            <div className="flex-1">
              <h1 className="type-title text-xl text-text">Roster</h1>
              <p className="text-[13px] text-muted">
                {formatTimeRange(found.s.start_time, found.s.end_time)} · {all.length} confirmed · refreshes every 10 s
              </p>
            </div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a volunteer" leading={<Search />} inputSize="sm" className="lg:w-52" aria-label="Find a volunteer" />
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
            <Segmented
              size="sm"
              value={filter}
              onValueChange={setFilter}
              aria-label="Filter roster"
              options={[
                { value: 'all', label: `All · ${all.length}` },
                { value: 'in', label: `On site · ${inCount}` },
                { value: 'missing', label: 'Not here' },
                { value: 'out', label: 'Checked out' },
              ]}
            />
            <div className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
              <Users className="size-4 text-faint" />
              <span className="type-data text-text">{inCount}</span>/{found.s.capacity} spots in use
            </div>
          </div>
          <div className="p-3">
            {roster.isLoading ? (
              <Skeleton className="m-2 h-40" />
            ) : roster.error ? (
              <ErrorState error={roster.error} onRetry={() => roster.refetch()} />
            ) : rows.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted">{all.length ? 'Nobody matches this filter.' : 'No confirmed volunteers yet. Approve applications first.'}</p>
            ) : (
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {rows.map((r) => {
                    const st = statusOf(r, start);
                    return (
                      <motion.li key={r.assignment_id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-2 py-3">
                        <Avatar name={r.volunteer.user?.full_name ?? '?'} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-medium text-text">{r.volunteer.user?.full_name}</div>
                          <div className="truncate text-[12px] text-faint">{r.volunteer.user?.email}</div>
                        </div>
                        <Badge tone={st.tone} size="sm" dot={st.key === 'in'} pulse={st.key === 'in'}>
                          {st.label}
                        </Badge>
                        {st.key === 'missing' && r.status === 'confirmed' && (
                          <Button size="xs" variant="ghost" onClick={() => setManual(r)}>
                            <PenLine /> Manual
                          </Button>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Full screen presenter */}
      <Dialog open={presenting} onOpenChange={setPresenting}>
        <DialogContent title={found.e.title} description="Point volunteers’ phones here. The code refreshes automatically." size="xl">
          <div className="py-4">{qrPanel(true)}</div>
        </DialogContent>
      </Dialog>

      {/* Manual check-in */}
      <Dialog
        open={Boolean(manual)}
        onOpenChange={(o) => {
          if (!o) {
            setManual(null);
            setSignature(null);
            setReason('');
          }
        }}
      >
        <DialogContent title={`Check in ${manual?.volunteer.user?.full_name ?? ''} manually`} description="Use when the volunteer is here but GPS or the camera won’t work. This is logged to the audit trail." size="md">
          <div className="space-y-4">
            <Field label="Reason">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Phone battery died at the gate" />
            </Field>
            <Field label="Volunteer’s signature" hint="Hand the device to the volunteer to sign.">
              <SignaturePad onChange={setSignature} />
            </Field>
            {force.error && <InlineAlert tone="danger">{errorMessage(force.error)}</InlineAlert>}
          </div>
          <DialogActions>
            <Button variant="ghost" onClick={() => setManual(null)}>
              Cancel
            </Button>
            <Button
              disabled={!signature || !reason.trim()}
              loading={force.isPending}
              onClick={() =>
                manual &&
                signature &&
                force.mutate(
                  { assignmentId: manual.assignment_id, signature, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      notify.success('Checked in manually', manual.volunteer.user?.full_name);
                      setManual(null);
                      setSignature(null);
                      setReason('');
                    },
                  },
                )
              }
            >
              <UserCheck2 /> Check in
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
