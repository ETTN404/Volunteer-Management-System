import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Ban,
  Search,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Plus,
} from 'lucide-react';
import { User, Organization } from '../../types/vms';
import { VmsStore } from '../../services/vmsStore';

interface UserManagementProps {
  users: User[];
  organizations: Organization[];
  onDataChanged: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users = [],
  organizations = [],
  onDataChanged,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');

  const handleRoleChange = (userId: number, newRole: 'admin' | 'coordinator' | 'volunteer') => {
    const db = VmsStore.get();
    const u = db.users.find((user) => user.id === userId);
    if (u) {
      const oldRole = u.role;
      u.role = newRole;
      VmsStore.save();
      VmsStore.logAudit({
        action: 'user.role_change',
        modelType: 'User',
        modelId: u.id,
        oldValues: { role: oldRole },
        newValues: { role: newRole },
      });
      onDataChanged();
    }
  };

  const handleOrgChange = (userId: number, newOrgId: number) => {
    const db = VmsStore.get();
    const u = db.users.find((user) => user.id === userId);
    if (u) {
      const oldOrg = u.organization_id || u.org_id;
      u.organization_id = newOrgId;
      u.org_id = newOrgId;
      VmsStore.save();
      VmsStore.logAudit({
        action: 'user.tenant_reassign',
        modelType: 'User',
        modelId: u.id,
        oldValues: { organization_id: oldOrg },
        newValues: { organization_id: newOrgId },
      });
      onDataChanged();
    }
  };

  const filteredUsers = (users || []).filter((u) => {
    const nameMatch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;

    const r = (u.role || '').toLowerCase();
    const f = selectedRoleFilter.toLowerCase();

    let matchesRole = false;
    if (f === 'all') {
      matchesRole = true;
    } else if (f === 'admin') {
      matchesRole = r.includes('admin');
    } else if (f === 'coordinator') {
      matchesRole = r.includes('coord');
    } else if (f === 'volunteer') {
      matchesRole = r.includes('volun');
    } else {
      matchesRole = r === f;
    }

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-3.5 font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              USER ACCOUNTS & ROLE-BASED ACCESS CONTROL (RBAC)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {filteredUsers.length} MEMBERS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Manage organization members, assign authorization levels (§2.1 RBAC), and reallocate multi-tenant scopes.
          </p>
        </div>
      </div>

      {/* Search & Filter (High Density) */}
      <div className="bg-[#1e293b] p-2.5 rounded-lg border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['All', 'admin', 'coordinator', 'volunteer'].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                selectedRoleFilter.toLowerCase() === r.toLowerCase()
                  ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table (High Density) */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-700 text-[10px]">
              <tr>
                <th className="p-2.5">USER MEMBER</th>
                <th className="p-2.5">ASSIGNED TENANT</th>
                <th className="p-2.5">RBAC AUTHORIZATION</th>
                <th className="p-2.5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredUsers.map((u) => {
                const userRole = (u.role || '').toLowerCase();
                const normalizedRoleValue = userRole.includes('admin')
                  ? 'admin'
                  : userRole.includes('coord')
                  ? 'coordinator'
                  : 'volunteer';
                const assignedOrgId = u.organization_id || u.org_id || 1;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {(u.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{u.name}</div>
                          <div className="text-slate-400 text-[10px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <select
                        value={assignedOrgId}
                        onChange={(e) => handleOrgChange(u.id, Number(e.target.value))}
                        className="bg-slate-900 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        {(organizations || []).map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2.5">
                      <select
                        value={normalizedRoleValue}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded border focus:outline-none uppercase ${
                          normalizedRoleValue === 'admin'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : normalizedRoleValue === 'coordinator'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <option value="volunteer">Volunteer Role</option>
                        <option value="coordinator">Coordinator Role</option>
                        <option value="admin">System Admin Role</option>
                      </select>
                    </td>

                    <td className="p-2.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
