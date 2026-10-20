import { useEffect, useState } from 'react';
import { PageHeader } from '@/shared/ui';
import { AuditTrail, type AuditFilters } from '@/features/audit/audit-trail';
import { platformApi, useAllOrganizations, usePlatformAudit } from '@/features/platform/api';

export default function PlatformAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, action: '', from: '', to: '', org_id: '' });
  const query = { page: filters.page, action: filters.action || undefined, from: filters.from || undefined, to: filters.to || undefined, org_id: filters.org_id || undefined };
  const audit = usePlatformAudit(query);
  const orgs = useAllOrganizations();
  useEffect(() => {
    document.title = 'Audit trail · VolunTrack';
  }, []);
  return (
    <>
      <PageHeader eyebrow="Governance" title="Platform audit trail" description="An append-only record of sensitive actions across every organization — readable on screen and in the CSV export." />
      <AuditTrail
        data={audit.data}
        isLoading={audit.isLoading}
        error={audit.error}
        onRetry={() => audit.refetch()}
        filters={filters}
        onFilters={setFilters}
        exportCsv={() => platformApi.auditCsv(query)}
        showOrg
        orgOptions={(orgs.data ?? []).map((o) => ({ value: String(o.id), label: o.name }))}
      />
    </>
  );
}
