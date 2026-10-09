import React, { useState, useEffect } from 'react';
import {
  Building2, Users, UserPlus, Eye, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, X, Plus, Ban, Edit3, Phone, Globe,
} from 'lucide-react';
import { Organization, User } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface OrgAdminDashboardProps {
  currentUser: User | null;
  theme: 'dark' | 'light';
  onDataChanged: () => void;
}

export const OrgAdminDashboard: React.FC<OrgAdminDashboardProps> = ({ currentUser, theme, onDataChanged }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'org' | 'coordinators' | 'members' | 'volunteers'>('org');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Organization data
  const [org, setOrg] = useState<Organization | null>(null);
  const [editOrgForm, setEditOrgForm] = useState({ name: '', email: '', phone: '', website: '' });
  const [savingOrg, setSavingOrg] = useState(false);

  // Create Coordinator
  const [showCreateCoord, setShowCreateCoord] = useState(false);
  const [coordForm, setCoordForm] = useState({ name: '', email: '', password: 'password123' });
  const [creatingCoord, setCreatingCoord] = useState(false);

  // Members
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Volunteers
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';
  const inputCls = `w-full px-3 py-2 rounded text-sm border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`;
  const labelCls = `block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`;

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); }
  };

  const loadOrg = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('GET', '/admin/organization', undefined, currentUser);
      if (res.status === 200) {
        const o = res.data?.organization || res.data;
        setOrg(o);
        setEditOrgForm({ name: o.name || '', email: o.email || '', phone: o.phone || '', website: o.website || '' });
      } else {
        showMsg(res.error || 'Failed to load organization.', true);
      }
    } finally { setLoading(false); }
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await ApiClient.request('GET', '/admin/members', undefined, currentUser);
      if (res.status === 200) setMembers(Array.isArray(res.data) ? res.data : res.data?.data || []);
      else showMsg(res.error || 'Failed to load members.', true);
    } finally { setLoadingMembers(false); }
  };

  const loadVolunteers = async () => {
    setLoadingVolunteers(true);
    try {
      const res = await ApiClient.request('GET', '/admin/members', undefined, currentUser);
      if (res.status === 200) {
        const all = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setVolunteers(all.filter((u: User) => (u.role as string).toLowerCase().includes('volunteer')));
      }
    } finally { setLoadingVolunteers(false); }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  useEffect(() => {
    if (activeTab === 'members') loadMembers();
    if (activeTab === 'volunteers') loadVolunteers();
  }, [activeTab]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      const res = await ApiClient.request('PATCH', '/admin/organization', editOrgForm, currentUser);
      if (res.status === 200) { showMsg('Organization updated successfully!'); loadOrg(); onDataChanged(); }
      else showMsg(res.error || 'Failed to update organization.', true);
    } finally { setSavingOrg(false); }
  };

  const handleCreateCoord = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCoord(true);
    try {
      const coordName = coordForm.full_name || coordForm.name;
      const payload = {
        full_name: coordName,
        name: coordName,
        email: coordForm.email,
        password: coordForm.password,
      };
      const res = await ApiClient.request('POST', '/admin/coordinators', payload, currentUser);
      if (res.status === 201 || res.status === 200) {
        showMsg(`Coordinator "${coordName}" created successfully!`);
        setShowCreateCoord(false);
        setCoordForm({ name: '', full_name: '', email: '', password: 'password123' });
        loadMembers();
        onDataChanged();
      } else showMsg(res.error || 'Failed to create coordinator.', true);
    } finally { setCreatingCoord(false); }
  };

  const handleToggleVolunteer = async (userId: number, currentStatus: boolean) => {
    setTogglingId(userId);
    try {
      const res = await ApiClient.request('PATCH', `/admin/volunteers/${userId}/status`,
        { is_active: !currentStatus }, currentUser);
      if (res.status === 200) {
        showMsg(`Volunteer status updated.`);
        setVolunteers((prev) => prev.map((v) => v.id === userId ? { ...v, is_active: !currentStatus } : v));
      } else showMsg(res.error || 'Failed to toggle volunteer status.', true);
    } finally { setTogglingId(null); }
  };

  const handleViewVolunteer = async (volunteerId: number) => {
    try {
      const res = await ApiClient.request('GET', `/admin/volunteers/${volunteerId}`, undefined, currentUser);
      if (res.status === 200) setSelectedVolunteer(res.data?.volunteer || res.data);
    } catch { /* show from list */ }
  };

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button key={id} onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 text-xs font-bold rounded-t border-b-2 transition-colors ${
        activeTab === id ? 'border-indigo-500 text-indigo-400' : `border-transparent ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
      }`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-lg border p-4 ${cardBg}`}>
        <h1 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          Organization Admin Portal
        </h1>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Manage your organization, coordinators, and volunteer roster.
        </p>
        <p className="text-[10px] font-mono text-indigo-400 mt-1">
          API: GET/PATCH /api/admin/organization · POST /api/admin/coordinators · GET /api/admin/members
        </p>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

      {/* Tabs */}
      <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} flex gap-1`}>
        {tabBtn('org', '🏢 My Organization')}
        {tabBtn('coordinators', '👥 Create Coordinator')}
        {tabBtn('members', '📋 All Members')}
        {tabBtn('volunteers', '🙋 Manage Volunteers')}
      </div>

      {/* MY ORGANIZATION TAB */}
      {activeTab === 'org' && (
        <div className={`rounded-lg border p-4 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Organization Details</h2>
            <button onClick={loadOrg} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500'}`}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
          ) : (
            <form onSubmit={handleSaveOrg} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Organization Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required value={editOrgForm.name} onChange={(e) => setEditOrgForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} pl-9`} placeholder="Organization name" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Contact Email</label>
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={editOrgForm.email} onChange={(e) => setEditOrgForm((p) => ({ ...p, email: e.target.value }))} className={`${inputCls} pl-9`} placeholder="contact@org.org" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={editOrgForm.phone} onChange={(e) => setEditOrgForm((p) => ({ ...p, phone: e.target.value }))} className={`${inputCls} pl-9`} placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={editOrgForm.website} onChange={(e) => setEditOrgForm((p) => ({ ...p, website: e.target.value }))} className={`${inputCls} pl-9`} placeholder="https://example.org" />
                  </div>
                </div>
              </div>
              {org && (
                <div className={`rounded p-3 text-[10px] space-y-0.5 ${isDark ? 'bg-slate-800/60 text-slate-500' : 'bg-slate-50 text-slate-500'}`}>
                  <div>Plan: <span className="font-bold text-indigo-400">{org.subscription_plan}</span></div>
                  <div>Status: <span className={`font-bold ${org.status === 'suspended' ? 'text-red-400' : 'text-emerald-400'}`}>{org.status || 'active'}</span></div>
                  <div>Geofence Radius: {org.geofence_default_radius || 100}m</div>
                </div>
              )}
              <button type="submit" disabled={savingOrg}
                className="w-full py-2 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2">
                {savingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {savingOrg ? 'Saving…' : 'Save Changes — PATCH /api/admin/organization'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* CREATE COORDINATOR TAB */}
      {activeTab === 'coordinators' && (
        <div className={`rounded-lg border p-4 ${cardBg}`}>
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Create New Coordinator
          </h2>
          <form onSubmit={handleCreateCoord} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Full Name *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required value={coordForm.name || coordForm.full_name} onChange={(e) => setCoordForm((p) => ({ ...p, name: e.target.value, full_name: e.target.value }))} className={`${inputCls} pl-9`} placeholder="Marcus Reed" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input required type="email" value={coordForm.email} onChange={(e) => setCoordForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="coord@org.org" />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input required type="password" value={coordForm.password} onChange={(e) => setCoordForm((p) => ({ ...p, password: e.target.value }))} className={inputCls} placeholder="password123" />
              </div>
            </div>
            <button type="submit" disabled={creatingCoord}
              className="w-full py-2 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2">
              {creatingCoord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {creatingCoord ? 'Creating…' : 'Create Coordinator — POST /api/admin/coordinators'}
            </button>
          </form>
          <div className={`mt-4 p-3 rounded text-[10px] ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-500'}`}>
            The created coordinator will receive the <span className="font-bold text-indigo-400">Coordinator</span> role and can manage events, shifts, and applications within your organization.
          </div>
        </div>
      )}

      {/* ALL MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className={`rounded-lg border ${cardBg}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              All Members — GET /api/admin/members
            </span>
            <button onClick={loadMembers} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <RefreshCw className={`w-3 h-3 ${loadingMembers ? 'animate-spin' : ''}`} /> Reload
            </button>
          </div>
          {loadingMembers ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
          ) : (
            <div className="divide-y divide-slate-800">
              {members.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No members loaded. Click Reload.</div>
              ) : members.map((m) => (
                <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{m.name}</div>
                    <div className="text-[10px] text-slate-500">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{m.role}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANAGE VOLUNTEERS TAB */}
      {activeTab === 'volunteers' && (
        <div className="space-y-3">
          <div className={`rounded-lg border ${cardBg}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Volunteer Roster — PATCH /api/admin/volunteers/:id/status
              </span>
              <button onClick={loadVolunteers} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                <RefreshCw className={`w-3 h-3 ${loadingVolunteers ? 'animate-spin' : ''}`} /> Reload
              </button>
            </div>
            {loadingVolunteers ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : (
              <div className="divide-y divide-slate-800">
                {volunteers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No volunteers loaded. Click Reload.</div>
                ) : volunteers.map((v) => (
                  <div key={v.id} className={`flex items-center justify-between px-4 py-2.5 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{v.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{v.email}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${v.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {v.is_active ? 'Active' : 'Suspended'}
                      </span>
                      <button onClick={() => handleViewVolunteer(v.volunteer_id || v.id)}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-indigo-400' : 'border-slate-200 text-slate-500 hover:text-indigo-600'}`}>
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button
                        disabled={togglingId === v.id}
                        onClick={() => handleToggleVolunteer(v.id, v.is_active)}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                          v.is_active ? 'border-red-600/40 text-red-400 hover:border-red-500' : 'border-emerald-600/40 text-emerald-400 hover:border-emerald-500'
                        }`}>
                        {togglingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        {v.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volunteer Detail Panel */}
          {selectedVolunteer && (
            <div className={`rounded-lg border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Volunteer Profile — GET /api/admin/volunteers/{'{id}'}
                </h3>
                <button onClick={() => setSelectedVolunteer(null)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <div className={`grid grid-cols-2 gap-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <div><span className="font-bold">Skills:</span> {(selectedVolunteer.skills || []).join(', ')}</div>
                <div><span className="font-bold">Total Hours:</span> {selectedVolunteer.total_hours}h</div>
                <div><span className="font-bold">Impact Score:</span> {selectedVolunteer.impact_score}</div>
                <div><span className="font-bold">Attendance Rate:</span> {selectedVolunteer.attendance_rate}%</div>
                <div className="col-span-2"><span className="font-bold">Bio:</span> {selectedVolunteer.bio || 'N/A'}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
