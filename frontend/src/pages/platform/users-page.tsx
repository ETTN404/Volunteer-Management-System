import { Search, Users } from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import type { Role } from '@/shared/types/api';
import { formatRelative } from '@/shared/lib/time';
import { Avatar, Badge, Card, EmptyState, ErrorState, Input, PageHeader, Segmented, Skeleton } from '@/shared/ui';
import { usePlatformUsers } from '@/features/platform/api';
import { ROLE_LABEL } from '@/features/auth/session-store';

const ROLE_TONE: Record<Role, 'accent' | 'info' | 'success' | 'neutral'> = { SuperAdmin: 'accent', OrgAdmin: 'info', Coordinator: 'success', Volunteer: 'neutral' };

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const deferred = useDeferredValue(q);
  const users = usePlatformUsers(deferred, role);
  useEffect(() => {
    document.title = 'All users · VolunTrack';
  }, []);

  return (
    <>
      <PageHeader eyebrow="Governance" title="All users" description="Everyone with a VolunTrack account, across every organization." />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" leading={<Search />} className="md:w-72" aria-label="Search users" />
        <Segmented
          value={role}
          onValueChange={setRole}
          aria-label="Role"
          options={[
            { value: '', label: 'Everyone' },
            { value: 'Volunteer', label: 'Volunteers' },
            { value: 'Coordinator', label: 'Coordinators' },
            { value: 'OrgAdmin', label: 'Org admins' },
            { value: 'SuperAdmin', label: 'Platform' },
          ]}
        />
      </div>
      {users.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : users.error ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : !users.data?.length ? (
        <EmptyState icon={<Users />} title="No users match" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-left text-[11.5px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.data.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name} size="sm" />
                      <span>
                        <span className="block font-medium text-text">
                          {u.full_name} {!u.is_active && <span className="ml-1 text-[11px] text-danger-text">inactive</span>}
                        </span>
                        <span className="block text-[12px] text-faint">{u.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge size="sm" tone={ROLE_TONE[u.role]}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">{u.organization?.name ?? 'Platform'}</td>
                  <td className="px-5 py-3 text-muted">{u.last_login ? formatRelative(u.last_login) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-5 py-3 text-[12px] text-faint">{users.data.length} users</p>
        </Card>
      )}
    </>
  );
}
