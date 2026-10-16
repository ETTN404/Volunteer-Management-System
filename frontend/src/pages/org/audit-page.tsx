import { useEffect } from 'react';
import { PageHeader } from '@/shared/ui';
import { AuditTrail } from '@/features/audit/audit-trail';
import { useOrgAudit } from '@/features/organization/api';

export default function OrgAuditPage() {
  const audit = useOrgAudit();
  useEffect(() => {
    document.title = 'Audit trail · VolunTrack';
  }, []);
  return (
    <>
      <PageHeader eyebrow="Organization" title="Audit trail" description="Every change to your organization’s settings, staff, events and attendance — who did it, when, and what changed." />
      <AuditTrail logs={audit.data} isLoading={audit.isLoading} error={audit.error} onRetry={() => audit.refetch()} />
    </>
  );
}
