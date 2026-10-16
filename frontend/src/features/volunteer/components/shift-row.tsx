import { Check, Clock, Undo2 } from 'lucide-react';
import type { Shift, ShiftAssignment } from '@/shared/types/api';
import { formatDay, formatTimeRange, parseApiDate } from '@/shared/lib/time';
import { humanizeSkill } from '@/shared/lib/format';
import { skillDiff } from '@/shared/lib/skills';
import { errorMessage } from '@/shared/api/http';
import { cn } from '@/shared/lib/cn';
import { AssignmentBadge, Button, CapacityMeter, InlineAlert, notify } from '@/shared/ui';
import { useApplyForShift, useWithdrawApplication } from '../api';
import { MatchBadge } from './match-badge';

export function ShiftRow({
  shift,
  assignment,
  mySkills,
  blockedReason,
}: {
  shift: Shift;
  assignment?: ShiftAssignment;
  mySkills: string[];
  /** e.g. minor without consent (BR-02) */
  blockedReason?: string | null;
}) {
  const apply = useApplyForShift();
  const withdraw = useWithdrawApplication();
  const start = parseApiDate(shift.start_time);
  const past = start ? start < new Date() : false;
  const { matched, missing } = skillDiff(mySkills, shift.required_skills);
  const confirmed = shift.confirmed_count ?? 0;
  const full = confirmed >= shift.capacity;
  const error = apply.error ?? withdraw.error;

  return (
    <div className="rounded-lg bg-surface p-4 [box-shadow:inset_0_0_0_1px_var(--line)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-text">
              <Clock className="size-4 text-faint" />
              {formatDay(shift.start_time)} · {formatTimeRange(shift.start_time, shift.end_time)}
            </span>
            <MatchBadge score={shift.match_score} />
            {assignment && <AssignmentBadge status={assignment.status} size="sm" />}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shift.required_skills.length === 0 && <span className="text-[12.5px] text-faint">No specific skills needed</span>}
            {matched.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[11.5px] font-medium text-success-text">
                <Check className="size-3" /> {humanizeSkill(s)}
              </span>
            ))}
            {missing.map((s) => (
              <span key={s} className="rounded-md px-2 py-1 text-[11.5px] text-faint [box-shadow:inset_0_0_0_1px_var(--line)]">
                {humanizeSkill(s)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 sm:w-[300px] sm:justify-end">
          <CapacityMeter confirmed={shift.confirmed_count} capacity={shift.capacity} className="w-full max-w-[150px]" />
          {assignment?.status === 'pending' ? (
            <Button
              variant="ghost"
              size="sm"
              loading={withdraw.isPending}
              onClick={() =>
                withdraw.mutate(assignment.id, {
                  onSuccess: () => notify.success('Application withdrawn'),
                })
              }
            >
              <Undo2 /> Withdraw
            </Button>
          ) : assignment ? null : (
            <Button
              size="sm"
              disabled={past || full || Boolean(blockedReason)}
              loading={apply.isPending}
              onClick={() =>
                apply.mutate(shift.id, {
                  onSuccess: () => notify.success('Application sent', 'A coordinator will review it. You’ll get a notification when you’re confirmed.'),
                })
              }
            >
              {full ? 'Full' : past ? 'Started' : 'Apply'}
            </Button>
          )}
        </div>
      </div>
      {assignment?.status === 'cancelled' && assignment.decline_reason && (
        <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-[13px] text-muted">Coordinator note: {assignment.decline_reason}</p>
      )}
      {error && (
        <InlineAlert tone="danger" className={cn('mt-3')}>
          {errorMessage(error)}
        </InlineAlert>
      )}
    </div>
  );
}
