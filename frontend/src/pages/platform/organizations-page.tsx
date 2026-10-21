import { Building2, MoreHorizontal, Search, Settings2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Organization } from '@/shared/types/api';
import { formatDate } from '@/shared/lib/time';
import { Badge, Button, Card, DistributionBar, EmptyState, ErrorState, FilterChips, Input, Menu, MenuContent, MenuItem, MenuTrigger, PageHeader, Skeleton } from '@/shared/ui';
import { useAllOrganizations } from '@/features/platform/api';
import { OrgStatusDialog } from '@/features/platform/org-status-dialog';

export default function OrganizationsPage() {
  const orgs = useAllOrganizations();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Organization['status']>('all');
  const [managing, setManaging] = useState<Organization | null>(null);
  useEffect(() => {
    document.title = 'Organizations · VolunTrack';
  }, []);

  const list = useMemo(() => {
    let r = orgs.data ?? [];
    if (status !== 'all') r = r.filter((o) => o.status === status);
    if (q.trim()) r = r.filter((o) => `${o.name} ${o.email} ${o.address}`.toLowerCase().includes(q.trim().toLowerCase()));
    return r;
  }, [orgs.data, q, status]);

  return (
    <>
      <PageHeader
        title="Organizations"
        actions={
          <Button asChild>
            <Link to="/p/onboard">
              <UserPlus /> Onboard an organization
            </Link>
          </Button>
        }
      />
      <Card className="mb-5 overflow-hidden">
        <div className="space-y-4 p-4 sm:p-5">
          <DistributionBar
            segments={[
              { value: (orgs.data ?? []).filter((o) => o.status === 'active').length, hue: 'emerald', label: 'Active' },
              { value: (orgs.data ?? []).filter((o) => o.status === 'suspended').length, hue: 'rose', label: 'Suspended' },
              { value: (orgs.data ?? []).filter((o) => o.status === 'inactive').length, hue: 'amber', label: 'Inactive' },
            ]}
          />
          <FilterChips
            value={status}
            onChange={setStatus}
            aria-label="Status"
            options={[
              { value: 'all', label: 'All', count: (orgs.data ?? []).length },
              { value: 'active', label: 'Active', hue: 'emerald', count: (orgs.data ?? []).filter((o) => o.status === 'active').length },
              { value: 'suspended', label: 'Suspended', hue: 'rose', count: (orgs.data ?? []).filter((o) => o.status === 'suspended').length },
              { value: 'inactive', label: 'Inactive', hue: 'amber', count: (orgs.data ?? []).filter((o) => o.status === 'inactive').length },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center sm:px-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or city" leading={<Search />} className="sm:w-80" aria-label="Search organizations" />
          <span className="text-[13px] text-muted sm:ml-auto">{list.length} shown</span>
        </div>
      </Card>
      {orgs.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : orgs.error ? (
        <ErrorState error={orgs.error} onRetry={() => orgs.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No organizations match" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Since</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-surface-2/50" onClick={() => navigate(`/p/organizations/${o.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-[11px] font-bold text-muted">
                        {o.logo_url ? <img src={o.logo_url} alt="" className="size-full object-contain" /> : o.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <Link to={`/p/organizations/${o.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-text hover:text-accent-text">
                          {o.name}
                        </Link>
                        <span className="block truncate text-[12px] text-faint">{o.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge size="sm" tone={o.subscription_plan === 'enterprise' ? 'accent' : o.subscription_plan === 'pro' ? 'info' : 'neutral'}>
                      {o.subscription_plan ?? 'free'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge size="sm" dot tone={o.status === 'active' ? 'success' : o.status === 'suspended' ? 'danger' : 'neutral'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{formatDate(o.created_at, 'MMM yyyy')}</td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Menu>
                      <MenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${o.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </MenuTrigger>
                      <MenuContent>
                        <MenuItem onSelect={() => setManaging(o)}>
                          <Settings2 /> Status & plan
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <OrgStatusDialog org={managing} onClose={() => setManaging(null)} />
    </>
  );
}
