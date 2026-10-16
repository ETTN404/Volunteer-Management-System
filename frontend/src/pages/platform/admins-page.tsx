import { Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { formatRelative } from '@/shared/lib/time';
import { Avatar, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton, Switch, notify } from '@/shared/ui';
import { useOrgAdmins, useToggleAdmin } from '@/features/platform/api';

export default function AdminsPage() {
  const admins = useOrgAdmins();
  const toggle = useToggleAdmin();
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = 'Org admins · VolunTrack';
  }, []);
  const list = useMemo(() => (admins.data ?? []).filter((a) => `${a.full_name} ${a.email} ${a.organization?.name}`.toLowerCase().includes(q.trim().toLowerCase())), [admins.data, q]);

  return (
    <>
      <PageHeader eyebrow="Governance" title="Organization admins" description="The people who run each tenant. Deactivating an admin signs them out of their organization." />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search admins or organizations" leading={<Search />} className="mb-5 sm:w-80" aria-label="Search admins" />
      {admins.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : admins.error ? (
        <ErrorState error={admins.error} onRetry={() => admins.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="No admins match" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
                <th className="px-5 py-3 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.full_name} size="sm" />
                      <span>
                        <span className="block font-medium text-text">{a.full_name}</span>
                        <span className="block text-[12px] text-faint">{a.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {a.organization ? (
                      <Link to={`/p/organizations/${a.organization.id}`} className="text-text hover:text-accent-text">
                        {a.organization.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted">{a.last_login ? formatRelative(a.last_login) : 'Never'}</td>
                  <td className="px-5 py-3 text-right">
                    <Switch checked={a.is_active} aria-label={`${a.full_name} active`} onCheckedChange={() => toggle.mutate(a.id, { onSuccess: (r) => notify.success(r.message, a.full_name), onError: (e) => notify.error(e) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
