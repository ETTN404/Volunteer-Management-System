import { Flag } from 'lucide-react';
import { useState } from 'react';
import type { OrgReportCategory } from '@/shared/types/api';
import { errorMessage } from '@/shared/api/http';
import { Button, Dialog, DialogActions, DialogContent, DialogTrigger, Field, FormError, Select, Textarea, notify } from '@/shared/ui';
import { useReportOrganization } from '../api';

const CATEGORIES: { value: OrgReportCategory; label: string }[] = [
  { value: 'payment_requested', label: 'They asked volunteers for money' },
  { value: 'fraud_or_scam', label: 'Fake organization or scam' },
  { value: 'misleading_event', label: 'Event is misleading or did not happen' },
  { value: 'unsafe_conditions', label: 'Unsafe conditions' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'other', label: 'Something else' },
];

/** Volunteers report an organization to the VolunTrack platform team (not to the organization). */
export function ReportOrgDialog({ orgId, orgName, eventId, trigger }: { orgId: number; orgName: string; eventId?: number; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<OrgReportCategory>('payment_requested');
  const [details, setDetails] = useState('');
  const report = useReportOrganization();
  const tooShort = details.trim().length < 20;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Flag /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={`Report ${orgName}`} description="Your report goes privately to the VolunTrack platform team, not to the organization.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            report.mutate(
              { orgId, category, details: details.trim(), event_id: eventId ?? null },
              {
                onSuccess: (r) => {
                  notify.success('Report sent', r.message ?? 'The platform team will review it.');
                  setOpen(false);
                  setDetails('');
                },
              },
            );
          }}
        >
          <Field label="What happened?">
            <Select value={category} onValueChange={(v) => setCategory(v as OrgReportCategory)} options={CATEGORIES} />
          </Field>
          <Field label="Details" hint="Dates, names and what was said help us act quickly. At least 20 characters.">
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} maxLength={3000} />
          </Field>
          <FormError message={report.error ? errorMessage(report.error) : null} />
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={report.isPending} disabled={tooShort}>
              Send report
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
