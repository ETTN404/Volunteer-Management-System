import { useCallback, useEffect } from 'react';
import { PageHeader } from '@/shared/ui';
import { AuditTrail } from '@/features/audit/audit-trail';
import { useAllOrganizations, usePlatformAudit } from '@/features/platform/api';

export default function PlatformAuditPage() {
  const audit = usePlatformAudit();
  const orgs = useAllOrganizations();
  useEffect(() => {
    document.title = 'Audit trail · VolunTrack';
  }, []);
  const orgName = useCallback((id: number | null) => (id == null ? undefined : orgs.data?.find((o) => o.id === id)?.name), [orgs.data]);
  return (
    <>
      <PageHeader eyebrow="Governance" title="Platform audit trail" description="An append-only record of sensitive actions across every organization." />
      <AuditTrail logs={audit.data} isLoading={audit.isLoading} error={audit.error} onRetry={() => audit.refetch()} orgName={orgName} />
    </>
  );
}
