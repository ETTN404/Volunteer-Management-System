import { useEffect, useState } from 'react';
import type { Organization } from '@/shared/types/api';
import { errorMessage } from '@/shared/api/http';
import { Button, Dialog, DialogActions, DialogContent, Field, InlineAlert, Select, notify } from '@/shared/ui';
import { PLANS, useUpdateOrgStatus } from './api';

export function OrgStatusDialog({ org, onClose }: { org: Organization | null; onClose: () => void }) {
  const update = useUpdateOrgStatus();
  const [status, setStatus] = useState<Organization['status']>('active');
  const [plan, setPlan] = useState('free');
  useEffect(() => {
    if (org) {
      setStatus(org.status);
      setPlan(org.subscription_plan ?? 'free');
    }
  }, [org]);
  const suspending = org && status === 'suspended' && org.status !== 'suspended';

  return (
    <Dialog open={Boolean(org)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Manage ${org?.name ?? ''}`} size="sm">
        <div className="space-y-4">
          <Field label="Status">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Organization['status'])}
              options={[
                { value: 'active', label: 'Active', hint: 'Full access' },
                { value: 'suspended', label: 'Suspended', hint: 'Every member is signed out and blocked' },
                { value: 'inactive', label: 'Inactive', hint: 'Dormant, kept for records' },
              ]}
            />
          </Field>
          <Field label="Plan">
            <Select value={plan} onValueChange={setPlan} options={PLANS.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          {suspending && (
            <InlineAlert tone="danger" title="Suspending signs everyone out">
              All {org?.name} admins, coordinators and volunteers lose access immediately. Admins are notified.
            </InlineAlert>
          )}
          {update.error && <InlineAlert tone="danger">{errorMessage(update.error)}</InlineAlert>}
        </div>
        <DialogActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={suspending ? 'danger' : 'primary'}
            loading={update.isPending}
            disabled={!org || (status === org.status && plan === (org.subscription_plan ?? 'free'))}
            onClick={() =>
              org &&
              update.mutate(
                { id: org.id, status, subscription_plan: plan },
                {
                  onSuccess: () => {
                    notify.success(suspending ? 'Organization suspended' : 'Organization updated', org.name);
                    onClose();
                  },
                },
              )
            }
          >
            {suspending ? 'Suspend organization' : 'Save changes'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
