import { ArrowLeft, Expand, IdCard, Info, LogIn, LogOut, MapPinned, Minimize2, Search, ShieldAlert, Siren, UserMinus, UserPlus, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { RosterEntry, VmsEvent } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatDay, formatTime, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { errorMessage } from '@/shared/api/http';
import { useNow } from '@/shared/hooks/use-now';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  EmptyState,
  ErrorState,
  InlineAlert,
  Input,
  SignaturePad,
  Skeleton,
  Textarea,
  formatPhone,
  notify,
} from '@/shared/ui';
import {
  useAssignVolunteer,
  useForceCheckIn,
  useRemoveFromShift,
  useReplacementCandidates,
  useRoster,
  useRotatingQr,
  useStaffCheckOut,
} from '@/features/operations/api';
import { BroadcastDialog } from '@/features/operations/components/broadcast-dialog';

type RowState = 'waiting' | 'on-shift' | 'left-early' | 'done' | 'pending' | 'removed';

function rowState(r: RosterEntry): RowState {
  if (r.status === 'removed') return 'removed';
  if (r.status === 'pending') return 'pending';
  const a = r.attendance;
  if (!a) return 'waiting';
  if (!a.check_out_time) return 'on-shift';
  return a.flags?.includes('left_early') ? 'left-early' : 'done';
}

const STATE: Record<RowState, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  waiting: { label: 'Not arrived', tone: 'neutral' },
  'on-shift': { label: 'On shift', tone: 'success' },
  'left-early': { label: 'Left early', tone: 'danger' },
  done: { label: 'Checked out', tone: 'info' },
  pending: { label: 'Application pending', tone: 'warning' },
  removed: { label: 'Removed', tone: 'neutral' },
};

const FLAG_TEXT: Record<string, string> = {
  manual_check_in: 'Checked in by staff',
  id_checked: 'ID checked',
  shared_device: 'Same phone as another volunteer',
  left_venue_during_shift: 'Phone left the venue during the shift',
  low_presence: 'Few location pings',
  checked_out_off_site: 'Checked out away from the venue',
  resumed: 'Resumed after check-out',
  auto_checked_out: 'Auto checked out',
  reopened_by_staff: 'Re-opened by staff',
};
const RISKY = new Set(['shared_device', 'left_venue_during_shift', 'checked_out_off_site', 'low_presence']);

function QrPanel({ shiftId, enabled }: { shiftId: number; enabled: boolean }) {
  const qr = useRotatingQr(shiftId, enabled);
  const now = useNow(250);
  const [big, setBig] = useState(false);
  const period = qr.data?.period_seconds ?? 30;
  const left = qr.data ? Math.max(0, (new Date(qr.data.rotates_at).getTime() - now.getTime()) / 1000) : period;
  const pct = Math.min(1, left / period);

  const code = qr.data ? (
    <div className={cn('relative mx-auto w-fit rounded-2xl bg-white p-4', big && 'p-8')}>
      <QRCodeSVG value={qr.data.token} size={big ? 440 : 216} level="M" fgColor="#11152b" title="Check-in QR code for this shift" />
    </div>
  ) : (
    <Skeleton className={cn('mx-auto rounded-2xl', big ? 'size-[500px]' : 'size-[248px]')} />
  );

  const ring = (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted">
      <svg viewBox="0 0 36 36" className="size-8 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="4" strokeDasharray={`${pct * 94.2} 94.2`} strokeLinecap="round" />
      </svg>
      <span>
        New code in <span className="type-data font-semibold text-text">{Math.ceil(left)}s</span>
      </span>
    </div>
  );

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="type-title text-base text-text">Check-in code</h2>
          <Button size="sm" variant="secondary" onClick={() => setBig(true)} disabled={!qr.data}>
            <Expand /> Full screen
          </Button>
        </div>
        {enabled ? code : <InlineAlert tone="info">The code appears 15 minutes before the shift starts.</InlineAlert>}
        {enabled && ring}
        {qr.error && <InlineAlert tone="danger" className="mt-3">{errorMessage(qr.error)}</InlineAlert>}
      </Card>
      <Dialog open={big} onOpenChange={setBig}>
        <DialogContent title="Scan to check in" description="Hold your phone camera over the code. It refreshes on its own." size="xl" className="text-center">
          {code}
          {ring}
          <Button variant="ghost" className="mt-4" onClick={() => setBig(false)}>
            <Minimize2 /> Exit full screen
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LiveShiftPage() {
  const shiftId = Number(useParams().shiftId);
  const roster = useRoster(shiftId);
  const entries = roster.data?.entries ?? [];
  const meta = roster.data?.meta;
  const now = useNow(15_000);
  const [q, setQ] = useState('');
  const [manualIn, setManualIn] = useState<RosterEntry | null>(null);
  const [manualOut, setManualOut] = useState<RosterEntry | null>(null);
  const [removing, setRemoving] = useState<RosterEntry | null>(null);
  const [filling, setFilling] = useState<{ replace?: RosterEntry } | null>(null);
  const [broadcast, setBroadcast] = useState(false);
  const [help, setHelp] = useState(false);

  const shift = meta?.shift;
  const event = shift?.event;

  useEffect(() => {
    document.title = 'Live shift · VolunTrack';
  }, []);

  const start = shift ? parseApiDate(shift.start_time) : null;
  const qrEnabled = !start || now.getTime() >= start.getTime() - 15 * 60_000;

  const filtered = entries.filter((r) => {
    const u = r.volunteer.user;
    const needle = q.trim().toLowerCase();
    return !needle || [u?.full_name, u?.email, u?.phone].some((x) => x?.toLowerCase().includes(needle));
  });
  const order: RowState[] = ['on-shift', 'waiting', 'left-early', 'done', 'pending', 'removed'];
  const sorted = [...filtered].sort((a, b) => order.indexOf(rowState(a)) - order.indexOf(rowState(b)));
  const leftEarly = entries.filter((r) => rowState(r) === 'left-early');

  if (roster.isLoading) return <Skeleton className="h-[560px] rounded-xl" />;
  if (roster.error) return <ErrorState error={roster.error} onRetry={() => roster.refetch()} />;

  return (
    <div className="min-w-0">
      <Link to={event ? `/c/events/${event.id}` : '/c/live'} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {event ? event.title : 'Live shifts'}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="type-eyebrow mb-2">Live shift</p>
          <h1 className="type-headline text-[clamp(1.6rem,5vw,2.3rem)] text-text">
            {shift?.title ?? 'Shift'} {shift && <span className="text-muted">· {formatDay(shift.start_time)} {formatTimeRange(shift.start_time, shift.end_time)}</span>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setHelp(true)}>
            <Info /> How check-in works
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setBroadcast(true)}>
            <Siren /> Urgent alert
          </Button>
        </div>
      </div>

      {meta && (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Confirmed', value: `${meta.confirmed}/${meta.capacity}` },
            { label: 'On shift now', value: meta.checked_in },
            { label: 'Checked out', value: meta.checked_out },
            { label: 'Left early', value: meta.left_early },
            { label: 'Open places', value: meta.open_places },
          ].map((k) => (
            <div key={k.label} className="rounded-lg bg-surface px-4 py-3 [box-shadow:inset_0_0_0_1px_var(--line)]">
              <dt className="text-xs text-muted">{k.label}</dt>
              <dd className="type-data mt-1 text-xl font-semibold text-text">{k.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(leftEarly.length > 0 || (meta?.open_places ?? 0) > 0) && (
        <InlineAlert
          tone="warning"
          className="mb-6"
          title={leftEarly.length ? `${leftEarly.length} volunteer(s) left early` : `${meta!.open_places} place(s) still open`}
          action={
            <Button size="sm" onClick={() => setFilling({ replace: leftEarly[0] })}>
              <UserPlus /> Fill the place
            </Button>
          }
        >
          Add someone who already works with you straight onto the shift — no new application needed — or send an urgent alert to matching volunteers.
        </InlineAlert>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title="Roster"
            description="Tap a volunteer without a phone to check them in after you check their ID."
            action={
              <div className="w-full sm:w-64">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by name, email or phone" leading={<Search />} inputSize="sm" aria-label="Find volunteer" />
              </div>
            }
          />
          {sorted.length === 0 ? (
            <EmptyState icon={<Users />} title={q ? 'No one matches' : 'No volunteers on this shift yet'} description={q ? undefined : 'Confirmed volunteers appear here.'} className="m-5" />
          ) : (
            <ul className="divide-y divide-line">
              {sorted.map((r) => {
                const st = rowState(r);
                const a = r.attendance;
                const u = r.volunteer.user;
                const risky = (a?.flags ?? []).filter((f) => RISKY.has(f));
                return (
                  <li key={r.assignment_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={u?.full_name ?? '?'} src={u?.profile_photo_url} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/c/volunteers/${r.volunteer.id}`} className="truncate font-medium text-text hover:text-accent-text">
                            {u?.full_name ?? 'Volunteer'}
                          </Link>
                          <Badge size="sm" tone={STATE[st].tone} dot pulse={st === 'on-shift'}>
                            {STATE[st].label}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-muted">
                          {a?.check_in_time ? `In ${formatTime(a.check_in_time)}` : u?.phone ? formatPhone(u.phone) : u?.email}
                          {a?.check_out_time && ` · out ${formatTime(a.check_out_time)} · ${formatHours(a.hours ?? 0)}`}
                          {a?.check_in_method === 'manual' && ' · by staff'}
                          {a && !a.check_out_time && a.presence?.last_ping_at && ` · last seen ${formatTime(a.presence.last_ping_at)}`}
                        </div>
                        {a?.check_out_reason && <div className="mt-1 text-[12.5px] text-danger-text">Reason: {a.check_out_reason}</div>}
                        {risky.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {risky.map((f) => (
                              <span key={f} className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning-text">
                                <ShieldAlert className="size-3" /> {FLAG_TEXT[f] ?? f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      {(st === 'waiting' || st === 'left-early' || st === 'done') && r.status === 'confirmed' && (
                        <Button size="sm" variant={st === 'waiting' ? 'primary' : 'secondary'} onClick={() => setManualIn(r)}>
                          <LogIn /> {st === 'waiting' ? 'Check in' : 'Check back in'}
                        </Button>
                      )}
                      {st === 'on-shift' && (
                        <Button size="sm" variant="secondary" onClick={() => setManualOut(r)}>
                          <LogOut /> Check out
                        </Button>
                      )}
                      {st === 'waiting' && r.status === 'confirmed' && (
                        <Button size="sm" variant="ghost" onClick={() => setRemoving(r)} aria-label="Remove from shift">
                          <UserMinus />
                        </Button>
                      )}
                      {st === 'left-early' && (
                        <Button size="sm" variant="ghost" onClick={() => setFilling({ replace: r })}>
                          <UserPlus /> Replace
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <QrPanel shiftId={shiftId} enabled={qrEnabled} />
          <Card className="p-5 text-[13px] text-muted">
            <div className="mb-2 flex items-center gap-2 font-medium text-text">
              <MapPinned className="size-4 text-accent-text" /> Volunteers must be at the venue
            </div>
            Self check-in needs the live code above <span className="text-text">and</span> the phone’s GPS inside the check-in area. Volunteers without a phone: find them in the roster and check them in after seeing their ID.
          </Card>
        </div>
      </div>

      <ManualCheckInDialog entry={manualIn} onClose={() => setManualIn(null)} />
      <ManualCheckOutDialog entry={manualOut} onClose={() => setManualOut(null)} />
      <RemoveDialog entry={removing} onClose={() => setRemoving(null)} />
      <FillDialog shiftId={shiftId} replace={filling?.replace} open={Boolean(filling)} onClose={() => setFilling(null)} onBroadcast={() => setBroadcast(true)} />
      {shift && event && (
        <BroadcastDialog
          events={[{ ...(event as unknown as VmsEvent), shifts: [shift] }]}
          open={broadcast}
          onOpenChange={setBroadcast}
          initialShiftId={shiftId}
        />
      )}
      <HowItWorksDialog open={help} onOpenChange={setHelp} />
    </div>
  );
}

function ManualCheckInDialog({ entry, onClose }: { entry: RosterEntry | null; onClose: () => void }) {
  const force = useForceCheckIn();
  const [idChecked, setIdChecked] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (entry) {
      setIdChecked(false);
      setSignature(null);
      setNote('');
      force.reset();
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps
  const u = entry?.volunteer.user;
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Check in ${u?.full_name ?? ''}`} description="For volunteers without a phone, data or GPS. You confirm they are here in person.">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
            <Avatar name={u?.full_name ?? '?'} src={u?.profile_photo_url} size="lg" />
            <div className="min-w-0 text-sm">
              <div className="font-medium text-text">{u?.full_name}</div>
              <div className="text-muted">{u?.phone ? formatPhone(u.phone) : u?.email}</div>
              {(entry?.volunteer.skills ?? []).length > 0 && <div className="mt-0.5 text-xs text-faint">{entry!.volunteer.skills.slice(0, 4).map(humanizeSkill).join(' · ')}</div>}
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-lg p-3 [box-shadow:inset_0_0_0_1px_var(--line)]">
            <Checkbox checked={idChecked} onCheckedChange={(v) => setIdChecked(Boolean(v))} />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium text-text">
                <IdCard className="size-4" /> I checked their ID and the name matches
              </span>
              <span className="text-muted">Kebele ID, passport, student or staff card.</span>
            </span>
          </label>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-text">
              Signature <span className="font-normal text-faint">optional if ID is checked</span>
            </div>
            <SignaturePad onChange={setSignature} className="h-32" />
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Note (optional), e.g. arrived late with transport" aria-label="Note" />
          {force.error && <InlineAlert tone="danger">{errorMessage(force.error)}</InlineAlert>}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!idChecked && !signature}
            loading={force.isPending}
            onClick={() =>
              entry &&
              force.mutate(
                { assignmentId: entry.assignment_id, id_verified: idChecked, signature_data: signature ?? undefined, note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    notify.success(`${u?.full_name ?? 'Volunteer'} checked in`);
                    onClose();
                  },
                },
              )
            }
          >
            <LogIn /> Check in
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function ManualCheckOutDialog({ entry, onClose }: { entry: RosterEntry | null; onClose: () => void }) {
  const out = useStaffCheckOut();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (entry) {
      setReason('');
      out.reset();
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Check out ${entry?.volunteer.user?.full_name ?? ''}`} description="Records now as their check-out time." size="sm">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="Reason (optional), e.g. No phone — checked out at the desk" aria-label="Reason" />
        {out.error && <InlineAlert tone="danger" className="mt-3">{errorMessage(out.error)}</InlineAlert>}
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={out.isPending}
            onClick={() =>
              entry?.attendance &&
              out.mutate({ attendanceId: entry.attendance.id, reason: reason.trim() || undefined }, { onSuccess: () => (notify.success('Checked out'), onClose()) })
            }
          >
            <LogOut /> Check out
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ entry, onClose }: { entry: RosterEntry | null; onClose: () => void }) {
  const remove = useRemoveFromShift();
  const [reason, setReason] = useState('Did not show up');
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Remove ${entry?.volunteer.user?.full_name ?? ''} from the shift?`} description="Frees the place so you can add someone else. The volunteer is told why." size="sm">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
        {remove.error && <InlineAlert tone="danger" className="mt-3">{errorMessage(remove.error)}</InlineAlert>}
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            loading={remove.isPending}
            onClick={() => entry && remove.mutate({ assignmentId: entry.assignment_id, reason: reason.trim() }, { onSuccess: () => (notify.success('Removed from shift'), onClose()) })}
          >
            Remove
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function FillDialog({ shiftId, replace, open, onClose, onBroadcast }: { shiftId: number; replace?: RosterEntry; open: boolean; onClose: () => void; onBroadcast: () => void }) {
  const candidates = useReplacementCandidates(open ? shiftId : null);
  const assign = useAssignVolunteer();
  const [q, setQ] = useState('');
  const list = (candidates.data ?? []).filter((c) => !q.trim() || c.volunteer.user?.full_name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={replace ? `Replace ${replace.volunteer.user?.full_name ?? 'volunteer'}` : 'Fill an open place'}
        description="Volunteers who already work with your organization and are free at this time. They are confirmed immediately and notified."
        size="lg"
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" leading={<Search />} aria-label="Search volunteers" />
        <div className="mt-3 max-h-[50vh] overflow-y-auto">
          {candidates.isLoading ? (
            <Skeleton className="h-40" />
          ) : list.length === 0 ? (
            <EmptyState icon={<Users />} title="No one available" description="Send an urgent alert instead — matching volunteers get a notification right away." className="shadow-none" />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((c) => (
                <li key={c.volunteer.id} className="flex items-center gap-3 py-3">
                  <Avatar name={c.volunteer.user?.full_name ?? '?'} src={c.volunteer.user?.profile_photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{c.volunteer.user?.full_name}</div>
                    <div className="truncate text-xs text-muted">
                      {c.match_score}% match{c.volunteer.user?.phone ? ` · ${formatPhone(c.volunteer.user.phone)}` : ''}
                      {c.applied ? ` · application ${c.applied}` : ''}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    loading={assign.isPending && assign.variables?.volunteer_id === c.volunteer.id}
                    onClick={() =>
                      assign.mutate(
                        { shiftId, volunteer_id: c.volunteer.id, replace_assignment_id: replace?.assignment_id, note: replace ? `Replacing ${replace.volunteer.user?.full_name}` : undefined },
                        { onSuccess: () => (notify.success(`${c.volunteer.user?.full_name} added to the shift`), onClose()), onError: (e) => notify.error(errorMessage(e)) },
                      )
                    }
                  >
                    <UserPlus /> Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogActions>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              onBroadcast();
            }}
          >
            <Siren /> Send urgent alert instead
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function HowItWorksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const items = [
    ['Who shows the code?', 'The coordinator at the venue opens this page on a phone, tablet or laptop (or projects it with “Full screen”).'],
    ['How do volunteers get it?', 'They open VolunTrack → Check in, share their location and point their camera at your screen. They never receive the code any other way.'],
    ['Why the timer?', 'The code changes every 30 seconds and a scan is accepted only for about a minute. A photo sent to a friend at home stops working almost immediately.'],
    ['What else is checked?', 'The phone’s GPS must be inside the venue ring (weak signals are refused), the phone clock must be correct, the volunteer must be confirmed, and it must be within the check-in window.'],
    ['Can someone still cheat?', 'GPS can be faked with special apps, so the QR (which needs someone physically here) is the main proof. While the app is open, location pings mark people who leave the venue; one phone used for several people is flagged; and every hour is verified by a coordinator before it counts.'],
    ['People without a phone?', 'Use “Check in” on their roster row after seeing their ID. Check them out the same way.'],
    ['Leaving early or forgetting?', 'Leaving early asks for a reason and alerts you here. Anyone who forgets to check out is closed automatically at the scheduled end, and you confirm the hours.'],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="How check-in works" size="lg">
        <dl className="space-y-4">
          {items.map(([q, a]) => (
            <div key={q}>
              <dt className="text-sm font-semibold text-text">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
