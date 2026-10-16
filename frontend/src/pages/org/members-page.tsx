import { Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { formatHours } from '@/shared/lib/format';
import { formatRelative } from '@/shared/lib/time';
import { Avatar, Card, EmptyState, ErrorState, Input, PageHeader, Segmented, Skeleton, Switch, Tooltip, notify } from '@/shared/ui';
import { useAllMembers, useToggleVolunteer } from '@/features/organization/api';

export default function MembersPage() {
  const members = useAllMembers();
  const toggle = useToggleVolunteer();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'active' | 'inactive'>('all');
  useEffect(() => {
    document.title = 'Volunteers · VolunTrack';
  }, []);

  const vols = useMemo(() => {
    let r = (members.data ?? []).filter((m) => m.role === 'Volunteer');
    if (scope !== 'all') r = r.filter((m) => m.is_active === (scope === 'active'));
    if (q.trim()) r = r.filter((m) => `${m.full_name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase()));
    return r;
  }, [members.data, q, scope]);
  const total = (members.data ?? []).filter((m) => m.role === 'Volunteer');

  return (
    <>
      <PageHeader eyebrow="People" title="Volunteers" description="Pause an account to stop someone applying for shifts. Their history stays intact." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" leading={<Search />} className="sm:w-72" aria-label="Search volunteers" />
        <Segmented
          value={scope}
          onValueChange={setScope}
          aria-label="Account status"
          options={[
            { value: 'all', label: `All · ${total.length}` },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Paused' },
          ]}
        />
      </div>
      {members.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : members.error ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : vols.length === 0 ? (
        <EmptyState icon={<Users />} title="No volunteers match" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Volunteer</th>
                <th className="px-5 py-3 font-medium">Hours</th>
                <th className="px-5 py-3 font-medium">Last active</th>
                <th className="px-5 py-3 text-right font-medium">Account active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {vols.map((m) => (
                <tr key={m.id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <Link to={m.volunteer ? `/o/members/${m.volunteer.id}` : '#'} className="flex items-center gap-3">
                      <Avatar name={m.full_name} src={m.profile_photo_url} size="sm" />
                      <span>
                        <span className="block font-medium text-text hover:text-accent-text">{m.full_name}</span>
                        <span className="block text-[12px] text-faint">{m.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="type-data px-5 py-3 text-text">{formatHours(m.volunteer?.total_hours ?? 0)}</td>
                  <td className="px-5 py-3 text-muted">{m.last_login ? formatRelative(m.last_login) : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <Tooltip content={m.is_active ? 'Pause account' : 'Reactivate account'}>
                      <span className="inline-flex">
                        <Switch
                          checked={m.is_active}
                          aria-label={`${m.full_name} account active`}
                          disabled={toggle.isPending && toggle.variables === m.id}
                          onCheckedChange={() => toggle.mutate(m.id, { onSuccess: (r) => notify.success(r.message, m.full_name), onError: (e) => notify.error(e) })}
                        />
                      </span>
                    </Tooltip>
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
