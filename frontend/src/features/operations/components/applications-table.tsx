import { Check, Copy, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { ShiftAssignment, VmsEvent } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatDay, formatRelative, formatTimeRange } from '@/shared/lib/time';
import { formatHours, humanizeSkill } from '@/shared/lib/format';
import { matchScore, skillDiff } from '@/shared/lib/skills';
import { errorMessage } from '@/shared/api/http';
import { AssignmentBadge, Avatar, Badge, Button, Checkbox, Dialog, DialogActions, DialogContent, EmptyState, Field, InlineAlert, Sheet, SheetContent, Skeleton, Textarea, notify } from '@/shared/ui';
import { MatchBadge } from '@/features/volunteer/components/match-badge';
import { useAiFeedback, useDecideApplication } from '../api';

export type ApplicationRowData = ShiftAssignment & { event: VmsEvent };

function FeedbackSheet({ app, onClose, onDecide }: { app: ApplicationRowData | null; onClose: () => void; onDecide: (a: ApplicationRowData, s: 'confirmed' | 'rejected', reason?: string) => void }) {
  const fb = useAiFeedback(app?.id ?? null);
  const v = app?.volunteer;
  const skills = v?.skills ?? [];
  const required = app?.shift?.required_skills ?? [];
  const { matched, missing } = skillDiff(skills, required);
  return (
    <Sheet open={Boolean(app)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent title={v?.user?.full_name ?? 'Applicant'} description={app ? `${app.event.title} · ${formatDay(app.shift?.start_time)} ${formatTimeRange(app.shift!.start_time, app.shift!.end_time)}` : undefined} width="md">
        {app && v && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={v.user?.full_name ?? ''} size="lg" />
              <div className="text-sm">
                <div className="font-medium text-text">{v.user?.email}</div>
                <div className="text-muted">
                  {formatHours(v.total_hours)} logged · impact {v.impact_score.toFixed(1)}
                </div>
                <Link to={`/c/volunteers/${v.id}`} className="text-[13px] font-medium text-accent-text hover:underline">
                  Full profile
                </Link>
              </div>
              <div className="ml-auto">
                <MatchBadge score={matchScore(skills, required)} size="md" />
              </div>
            </div>

            <section>
              <h3 className="type-eyebrow mb-2.5">Skills for this shift</h3>
              <div className="flex flex-wrap gap-1.5">
                {required.length === 0 && <span className="text-sm text-muted">No skills required.</span>}
                {matched.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[12px] font-medium text-success-text">
                    <Check className="size-3" /> {humanizeSkill(s)}
                  </span>
                ))}
                {missing.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-danger-soft px-2 py-1 text-[12px] font-medium text-danger-text">
                    <X className="size-3" /> {humanizeSkill(s)}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-accent-soft p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent-text">
                <Sparkles className="size-4" /> Suggested reply
              </h3>
              {fb.isLoading ? <Skeleton className="h-16" /> : fb.error ? <p className="text-sm text-danger-text">{errorMessage(fb.error)}</p> : <p className="text-[14px] leading-relaxed text-text">{fb.data?.ai_drafted_feedback}</p>}
              {fb.data && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="mt-3"
                  onClick={() => navigator.clipboard.writeText(fb.data!.ai_drafted_feedback).then(() => notify.success('Reply copied'))}
                >
                  <Copy /> Copy reply
                </Button>
              )}
            </section>

            {v.bio && (
              <section>
                <h3 className="type-eyebrow mb-2">About</h3>
                <p className="text-sm leading-relaxed text-muted">{v.bio}</p>
              </section>
            )}

            {app.status === 'pending' && (
              <div className="flex gap-2 border-t border-line pt-5">
                <Button variant="success" className="flex-1" onClick={() => onDecide(app, 'confirmed')}>
                  <Check /> Approve
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => onDecide(app, 'rejected', fb.data?.missing_skills.length ? fb.data.ai_drafted_feedback : undefined)}>
                  Decline
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ApplicationsTable({ rows, isLoading, showEvent = true }: { rows: ApplicationRowData[]; isLoading?: boolean; showEvent?: boolean }) {
  const decide = useDecideApplication();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<ApplicationRowData | null>(null);
  const [declining, setDeclining] = useState<{ app: ApplicationRowData; reason: string } | null>(null);
  const pendingIds = rows.filter((r) => r.status === 'pending').map((r) => r.id);

  const run = async (app: ApplicationRowData, status: 'confirmed' | 'rejected', reason?: string) => {
    try {
      await decide.mutateAsync({ assignmentId: app.id, status, reason });
      notify.success(status === 'confirmed' ? 'Approved' : 'Declined', `${app.volunteer?.user?.full_name} · ${app.event.title}`);
      setOpen(null);
      setDeclining(null);
      setSelected((s) => {
        const n = new Set(s);
        n.delete(app.id);
        return n;
      });
    } catch (e) {
      notify.error(e);
    }
  };

  const bulkApprove = async () => {
    const targets = rows.filter((r) => selected.has(r.id));
    let ok = 0;
    for (const t of targets) {
      try {
        await decide.mutateAsync({ assignmentId: t.id, status: 'confirmed' });
        ok++;
      } catch (e) {
        notify.error(e, `${t.volunteer?.user?.full_name}: couldn’t approve`);
      }
    }
    if (ok) notify.success(`${ok} ${ok === 1 ? 'volunteer' : 'volunteers'} approved`);
    setSelected(new Set());
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (rows.length === 0) return <EmptyState icon={<Check />} title="No applications here" description="New applications appear as volunteers apply for shifts." />;

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-accent-text">{selected.size} selected</span>
          <Button size="xs" variant="success" className="ml-auto" onClick={bulkApprove} loading={decide.isPending}>
            <Check /> Approve selected
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg bg-surface [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox
                  aria-label="Select all pending"
                  checked={pendingIds.length > 0 && pendingIds.every((id) => selected.has(id))}
                  onCheckedChange={(c) => setSelected(c ? new Set(pendingIds) : new Set())}
                />
              </th>
              <th className="px-3 py-3 font-medium">Volunteer</th>
              <th className="px-3 py-3 font-medium">{showEvent ? 'Shift' : 'Shift time'}</th>
              <th className="px-3 py-3 font-medium">Fit</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => {
              const v = a.volunteer;
              const required = a.shift?.required_skills ?? [];
              const { missing } = skillDiff(v?.skills ?? [], required);
              return (
                <tr key={a.id} className={cn('transition-colors hover:bg-surface-2/50', selected.has(a.id) && 'bg-accent-soft/40')}>
                  <td className="px-4 py-3">
                    {a.status === 'pending' && (
                      <Checkbox
                        aria-label={`Select ${v?.user?.full_name}`}
                        checked={selected.has(a.id)}
                        onCheckedChange={(c) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (c) n.add(a.id);
                            else n.delete(a.id);
                            return n;
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button className="flex items-center gap-3 text-left" onClick={() => setOpen(a)}>
                      <Avatar name={v?.user?.full_name ?? '?'} size="sm" />
                      <span>
                        <span className="block font-medium text-text hover:text-accent-text">{v?.user?.full_name}</span>
                        <span className="block text-[12px] text-faint">
                          {formatHours(v?.total_hours ?? 0)} · applied {formatRelative(a.applied_at)}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    {showEvent && <div className="max-w-56 truncate font-medium text-text">{a.event.title}</div>}
                    <div className="text-[12.5px] text-muted">
                      {formatDay(a.shift?.start_time)} · {a.shift && formatTimeRange(a.shift.start_time, a.shift.end_time)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <MatchBadge score={matchScore(v?.skills ?? [], required)} />
                      {missing.length > 0 && <span className="text-[11.5px] text-faint">missing {missing.map(humanizeSkill).join(', ')}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <AssignmentBadge status={a.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'pending' ? (
                      <div className="inline-flex gap-1.5">
                        <Button size="xs" variant="ghost" onClick={() => setOpen(a)}>
                          <Sparkles /> Review
                        </Button>
                        <Button size="xs" variant="success" onClick={() => run(a, 'confirmed')} loading={decide.isPending && decide.variables?.assignmentId === a.id && decide.variables.status === 'confirmed'}>
                          Approve
                        </Button>
                        <Button size="xs" variant="secondary" onClick={() => setDeclining({ app: a, reason: '' })}>
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Badge size="sm">{a.status === 'confirmed' ? 'Approved' : 'Closed'}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FeedbackSheet app={open} onClose={() => setOpen(null)} onDecide={(a, s, reason) => (s === 'rejected' ? setDeclining({ app: a, reason: reason ?? '' }) : run(a, s))} />

      <Dialog open={Boolean(declining)} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent title="Decline this application?" description={declining ? `${declining.app.volunteer?.user?.full_name} · ${declining.app.event.title}` : undefined} size="sm">
          {declining && (
            <>
              <Field label="Note to the volunteer" optional hint="Shown on their schedule. Be kind and specific.">
                <Textarea rows={4} value={declining.reason} maxLength={500} onChange={(e) => setDeclining({ ...declining, reason: e.target.value })} />
              </Field>
              {decide.error && <InlineAlert tone="danger" className="mt-3">{errorMessage(decide.error)}</InlineAlert>}
              <DialogActions>
                <Button variant="ghost" onClick={() => setDeclining(null)}>
                  Keep pending
                </Button>
                <Button variant="danger" loading={decide.isPending} onClick={() => run(declining.app, 'rejected', declining.reason.trim() || undefined)}>
                  Decline
                </Button>
              </DialogActions>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
