import { useEffect, useState } from 'react';
import type { OrgStatus, Organization, PlanKey } from '@/shared/types/api';
import { errorMessage } from '@/shared/api/http';
import { Button, DatePicker, Dialog, DialogActions, DialogContent, Field, InlineAlert, Select, Textarea, notify } from '@/shared/ui';
import { PLANS, useUpdateOrgStatus } from './api';

export function OrgStatusDialog({ org, onClose }: { org: Organization | null; onClose: () => void }) {
  const update = useUpdateOrgStatus();
  const [status, setStatus] = useState<OrgStatus>('active');
  const [plan, setPlan] = useState<PlanKey>('free');
  const [expires, setExpires] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (org) {
      setStatus(org.status);
      setPlan((org.subscription_plan ?? 'free') as PlanKey);
      setExpires(org.plan_expires_at ? org.plan_expires_at.slice(0, 10) : '');
      setReason('');
      update.reset();
    }
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps
  const blocking = org && status !== 'active' && org.status === 'active';
  const changed = org && (status !== org.status || plan !== (org.subscription_plan ?? 'free') || expires !== (org.plan_expires_at?.slice(0, 10) ?? ''));

  return (
    <Dialog open={Boolean(org)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Manage ${org?.name ?? ''}`} size="sm">
        <div className="space-y-4">
          <Field label="Status">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrgStatus)}
              options={[
                { value: 'active', label: 'Active', hint: 'Full access, events visible' },
                { value: 'suspended', label: 'Suspended', hint: 'Blocked for a violation' },
                { value: 'inactive', label: 'Inactive', hint: 'Dormant or closed, kept for records' },
              ]}
            />
          </Field>
          <Field label="Plan">
            <Select value={plan} onValueChange={(v) => setPlan(v as PlanKey)} options={PLANS.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          {plan !== 'free' && (
            <Field label="Paid until" optional hint="Leave empty for no end date (complimentary).">
              <DatePicker value={expires} onChange={setExpires} />
            </Field>
          )}
          {blocking && (
            <>
              <InlineAlert tone="danger" title={status === 'suspended' ? 'Suspending blocks staff immediately' : 'Marking inactive blocks staff'}>
                Admins and coordinators can’t sign in, and all of {org?.name}’s events disappear from volunteers. Volunteers keep their own accounts. Admins are notified.
              </InlineAlert>
              <Field label="Reason shown to the admins" optional>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
              </Field>
            </>
          )}
          {update.error && <InlineAlert tone="danger">{errorMessage(update.error)}</InlineAlert>}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={blocking ? 'danger' : 'primary'}
            loading={update.isPending}
            disabled={!changed}
            onClick={() =>
              org &&
              update.mutate(
                { id: org.id, status, subscription_plan: plan, plan_expires_at: plan === 'free' ? null : expires || null, reason: reason.trim() || undefined },
                {
                  onSuccess: () => {
                    notify.success('Organization updated', org.name);
                    onClose();
                  },
                },
              )
            }
          >
            {blocking ? (status === 'suspended' ? 'Suspend organization' : 'Mark inactive') : 'Save changes'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
