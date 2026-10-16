import { ArrowLeft, Globe, Mail, MapPin, Phone, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate, formatRelative } from '@/shared/lib/time';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, ErrorState, KeyValue, PageHeader, Skeleton } from '@/shared/ui';
import { useOrgAdmins, useOrganizationDetail, usePlatformAudit } from '@/features/platform/api';
import { OrgStatusDialog } from '@/features/platform/org-status-dialog';
import { actionLabel } from '@/features/audit/audit-trail';

export default function OrganizationDetailPage() {
  const id = Number(useParams().orgId);
  const detail = useOrganizationDetail(id);
  const admins = useOrgAdmins();
  const audit = usePlatformAudit();
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (detail.data) document.title = `${detail.data.organization.name} · VolunTrack`;
  }, [detail.data]);

  if (detail.isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (detail.error || !detail.data) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const { organization: o, user_count, event_count } = detail.data;
  const orgAdmins = (admins.data ?? []).filter((a) => a.org_id === o.id);
  const activity = (audit.data ?? []).filter((l) => l.org_id === o.id).slice(0, 8);

  return (
    <>
      <Link to="/p/organizations" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Organizations
      </Link>
      <PageHeader
        eyebrow={
          <>
            <Badge size="sm" dot tone={o.status === 'active' ? 'success' : o.status === 'suspended' ? 'danger' : 'neutral'}>
              {o.status}
            </Badge>
            <Badge size="sm">{o.subscription_plan ?? 'free'} plan</Badge>
          </>
        }
        title={o.name}
        description={`Tenant #${o.id} · onboarded ${formatDate(o.created_at)}`}
        actions={
          <Button variant="secondary" onClick={() => setManaging(true)}>
            <Settings2 /> Status & plan
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="type-eyebrow-sm">Members</div>
              <div className="type-display mt-3 text-4xl text-text">{user_count}</div>
            </Card>
            <Card className="p-5">
              <div className="type-eyebrow-sm">Events</div>
              <div className="type-display mt-3 text-4xl text-text">{event_count}</div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Recent activity" />
            <ul className="mt-2 divide-y divide-line px-5 pb-3">
              {activity.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="truncate text-text">{actionLabel(l.action)}</span>
                  <span className="shrink-0 text-[12px] text-faint">{formatRelative(l.created_at)}</span>
                </li>
              ))}
              {activity.length === 0 && <li className="py-6 text-center text-sm text-muted">No recorded activity yet.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <dl>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Mail className="size-3.5" />Email</span>}>{o.email}</KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Phone className="size-3.5" />Phone</span>}>{o.phone ?? '—'}</KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><MapPin className="size-3.5" />Address</span>}>{o.address ?? '—'}</KeyValue>
                <KeyValue label={<span className="inline-flex items-center gap-2"><Globe className="size-3.5" />Website</span>}>
                  {o.website ? (
                    <a href={o.website} target="_blank" rel="noreferrer" className="text-accent-text hover:underline">
                      {o.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    '—'
                  )}
                </KeyValue>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Organization admins" />
            <CardBody className="space-y-3">
              {orgAdmins.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Avatar name={a.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{a.full_name}</div>
                    <div className="truncate text-[12px] text-faint">{a.email}</div>
                  </div>
                  {!a.is_active && <Badge size="sm" tone="danger">Inactive</Badge>}
                </div>
              ))}
              {admins.isSuccess && orgAdmins.length === 0 && <p className="text-sm text-muted">No admins found.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
      <OrgStatusDialog org={managing ? o : null} onClose={() => setManaging(false)} />
    </>
  );
}
