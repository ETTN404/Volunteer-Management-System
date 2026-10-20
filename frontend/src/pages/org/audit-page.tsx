import { useEffect, useState } from 'react';
import { isApiError } from '@/shared/api/http';
import { PageHeader } from '@/shared/ui';
import { AuditTrail, type AuditFilters } from '@/features/audit/audit-trail';
import { orgApi, useOrgAudit } from '@/features/organization/api';
import { PlanLocked } from '@/features/organization/plan-notice';

export default function OrgAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, action: '', from: '', to: '' });
  const query = { page: filters.page, action: filters.action || undefined, from: filters.from || undefined, to: filters.to || undefined };
  const audit = useOrgAudit(query);
  useEffect(() => {
    document.title = 'Audit trail · VolunTrack';
  }, []);
  const locked = isApiError(audit.error) && audit.error.status === 402;
  return (
    <>
      <PageHeader eyebrow="Organization" title="Audit trail" description="Every change to your organization’s settings, staff, events and attendance — who did it, when, and what changed." />
      <PlanLocked locked={locked} plan="Pro">
        <AuditTrail
          data={audit.data}
          isLoading={audit.isLoading}
          error={locked ? null : audit.error}
          onRetry={() => audit.refetch()}
          filters={filters}
          onFilters={setFilters}
          exportCsv={() => orgApi.auditCsv(query)}
        />
      </PlanLocked>
    </>
  );
}
