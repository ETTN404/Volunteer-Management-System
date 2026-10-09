import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../services/apiClient';
import { Organization, User } from '../../types/vms';
import {
  Building2, Users, ShieldCheck, AlertCircle, CheckCircle2, Loader2,
  RefreshCw, Ban, Eye, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react';

interface AdminDashboardProps {
  organizations: Organization[];
  users: User[];
  events: any[];
  attendances: any[];
  auditLogs: any[];
  onNavigateTab: (tab: string) => void;
  onDataChanged: () => void;
  currentUser?: User | null;
  theme?: 'dark' | 'light';
}

interface DashboardMetrics {
  total_organizations: number;
  total_users: number;
  total_service_hours: number;
  total_audit_entries: number;
  active_organizations: number;
  suspended_organizations: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  organizations = [],
  users = [],
  events = [],
  attendances = [],
  auditLogs = [],
  onNavigateTab,
  onDataChanged,
  currentUser,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>(organizations);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailId, setShowDetailId] = useState<number | null>(null);

  // Provision Tenant Modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    org_name: '',
    org_email: '',
    org_address: 'Addis Ababa, Ethiopia',
    admin_full_name: '',
    admin_email: '',
    admin_password: 'password123',
    subscription_plan: 'pro' as 'free' | 'pro' | 'enterprise',
    geofence_default_radius: 100,
  });
  const [provisioning, setProvisioning] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, orgsRes] = await Promise.all([
        ApiClient.request('GET', '/superadmin/dashboard', undefined, currentUser),
        ApiClient.request('GET', '/superadmin/organizations', undefined, currentUser),
      ]);
      if (dashRes.status === 200 && dashRes.data) setMetrics(dashRes.data);
      if (orgsRes.status === 200 && Array.isArray(orgsRes.data)) setOrgs(orgsRes.data);
      else if (orgsRes.status === 200 && orgsRes.data?.data) setOrgs(orgsRes.data.data);
    } catch {
      setError('Failed to load SuperAdmin dashboard. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleStatusToggle = async (org: Organization) => {
    setActionLoading(org.id);
    setError(null);
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await ApiClient.request(
        'PATCH', `/superadmin/organizations/${org.id}/status`,
        { status: newStatus }, currentUser
      );
      if (res.status === 200) {
        setSuccess(`Organization "${org.name}" status updated to ${newStatus}.`);
        setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, status: newStatus } : o));
        onDataChanged();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Failed to update status.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewOrgDetail = async (orgId: number) => {
    if (showDetailId === orgId) { setShowDetailId(null); setSelectedOrg(null); return; }
    setShowDetailId(orgId);
    try {
      const res = await ApiClient.request('GET', `/superadmin/organizations/${orgId}`, undefined, currentUser);
      if (res.status === 200) setSelectedOrg(res.data?.organization || res.data);
    } catch { /* fallback to local data */ }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    setError(null);

    const slug = provisionForm.org_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const payload = {
      org_name: provisionForm.org_name,
      org_email: provisionForm.org_email || `contact@${slug || 'tenant'}.org`,
      org_address: provisionForm.org_address || 'Addis Ababa, Ethiopia',
      admin_full_name: provisionForm.admin_full_name,
      admin_email: provisionForm.admin_email,
      admin_password: provisionForm.admin_password,
    };

    try {
      const res = await ApiClient.request('POST', '/superadmin/onboard-tenant', payload, currentUser);
      if (res.status === 201 || res.status === 200) {
        setSuccess(`Tenant "${provisionForm.org_name}" onboarded successfully! Org Admin created.`);
        setShowProvisionModal(false);
        setProvisionForm({
          org_name: '',
          org_email: '',
          org_address: 'Addis Ababa, Ethiopia',
          admin_full_name: '',
          admin_email: '',
          admin_password: 'password123',
          subscription_plan: 'pro',
          geofence_default_radius: 100,
        });
        loadDashboard();
        onDataChanged();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(res.error || res.message || 'Onboarding failed.');
      }
    } catch {
      setError('Network error. Ensure Laravel backend is running.');
    } finally {
      setProvisioning(false);
    }
  };

  const displayOrgs = orgs.length > 0 ? orgs : organizations;
  const totalVerifiedHours = attendances.reduce((acc, a) => acc + (a.verified_hours || a.hours_worked || 0), 0);

  const statCards = [
    { label: 'Organizations', value: metrics?.total_organizations ?? displayOrgs.length, icon: Building2, color: 'indigo', badge: 'Subdomains Active' },
    { label: 'User Directory', value: metrics?.total_users ?? users.length, icon: Users, color: 'blue', badge: 'Across all roles' },
    { label: 'Service Output', value: `${(metrics?.total_service_hours ?? totalVerifiedHours).toFixed(1)} HRS`, icon: ShieldCheck, color: 'emerald', badge: 'Verified cumulative' },
    { label: 'Audit Trail', value: metrics?.total_audit_entries ?? auditLogs.length, icon: ShieldCheck, color: 'amber', badge: 'SOC-2 Immutable log' },
  ];

  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';
  const inputCls = `w-full px-3 py-2 rounded text-sm border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-lg border p-4 flex items-start justify-between ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              MULTI-TENANT ARCHITECTURE CONTROLLER (§1.1)
            </h1>
            <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-bold uppercase">SYS-ADMIN</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            System-wide tenancy oversight, database partition monitoring, and SOC-2 audit trails.
          </p>
          <p className="text-[10px] text-indigo-400 mt-1 font-mono">API: GET /api/superadmin/dashboard · GET /api/superadmin/organizations</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => loadDashboard()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setShowProvisionModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Provision Tenant
          </button>
          <button onClick={() => onNavigateTab('audits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${isDark ? 'border-amber-600/40 text-amber-400 hover:border-amber-500' : 'border-amber-300 text-amber-600 hover:border-amber-400'}`}>
            Audit Trail
          </button>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-lg border p-3 ${cardBg}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.label}</div>
            <div className={`text-2xl font-bold font-mono ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{loading ? '…' : s.value}</div>
            <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.badge}</div>
          </div>
        ))}
      </div>

      {/* Active Tenant Organizations */}
      <div className={`rounded-lg border ${cardBg}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Active Tenant Organizations
          </span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {displayOrgs.length} Tenancies Provisioned
          </span>
        </div>
        {loading && (
          <div className="flex items-center justify-center p-8 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-xs text-slate-500">Loading from API…</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {displayOrgs.map((org) => (
            <div key={org.id} className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                        org.subscription_plan === 'enterprise' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                        org.subscription_plan === 'pro' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>{org.subscription_plan || 'free'} Plan</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        org.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>{org.status || 'active'}</span>
                    </div>
                    <div className={`font-bold text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{org.name}</div>
                    <div className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {org.email || `${org.slug || org.subdomain || 'org'}.voluntrack.org`}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs shrink-0 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className={`flex items-center gap-3 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Radius: {org.geofence_default_radius || 100}m</span>
                </div>
              </div>
              <div className={`border-t px-3 py-2 flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                {/* View Detail */}
                <button onClick={() => handleViewOrgDetail(org.id)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                    isDark ? 'border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-600' : 'border-slate-200 text-slate-500 hover:text-indigo-600'
                  }`}>
                  <Eye className="w-3 h-3" />
                  {showDetailId === org.id ? 'Hide' : 'View'}
                  {showDetailId === org.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {/* Suspend / Activate */}
                <button
                  onClick={() => handleStatusToggle(org)}
                  disabled={actionLoading === org.id}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                    org.status === 'suspended'
                      ? 'border-emerald-600/40 text-emerald-400 hover:border-emerald-500'
                      : 'border-red-600/40 text-red-400 hover:border-red-500'
                  }`}
                >
                  {actionLoading === org.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                  {org.status === 'suspended' ? 'Activate' : 'Suspend'}
                </button>
                <span className="text-[9px] font-mono text-slate-600 ml-auto">
                  PATCH /organizations/{org.id}/status
                </span>
              </div>
              {/* Expanded Detail */}
              {showDetailId === org.id && (
                <div className={`border-t p-3 text-[11px] space-y-1 ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                  <div><span className="font-bold text-slate-500">ID:</span> {org.id}</div>
                  <div><span className="font-bold text-slate-500">Email:</span> {org.email || 'N/A'}</div>
                  <div><span className="font-bold text-slate-500">Phone:</span> {org.phone || 'N/A'}</div>
                  <div><span className="font-bold text-slate-500">Website:</span> {org.website || 'N/A'}</div>
                  <div><span className="font-bold text-slate-500">Geofence Radius:</span> {org.geofence_default_radius || 100}m</div>
                  <div><span className="font-bold text-slate-500">Total Volunteers:</span> {org.total_volunteers ?? 'N/A'}</div>
                  <div><span className="font-bold text-slate-500">Total Hours:</span> {org.total_hours ?? 'N/A'}</div>
                  <div className="text-[9px] font-mono text-indigo-400 mt-2">API: GET /superadmin/organizations/{org.id}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Provision Tenant Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-xl border shadow-2xl ${isDark ? 'bg-[#131d2e] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div>
                <h2 className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Provision New Tenant Organization</h2>
                <p className="text-[10px] text-indigo-400 font-mono mt-0.5">POST /api/superadmin/onboard-tenant</p>
              </div>
              <button onClick={() => setShowProvisionModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleProvision} className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Organization Name *</label>
                  <input required value={provisionForm.org_name}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, org_name: e.target.value }))}
                    placeholder="Black Lion Hospital" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Org Admin Name *</label>
                  <input required value={provisionForm.admin_full_name}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, admin_full_name: e.target.value }))}
                    placeholder="Eyob Tinse" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Org Admin Email *</label>
                  <input required type="email" value={provisionForm.admin_email}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, admin_email: e.target.value }))}
                    placeholder="et8302tn@gmail.com" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Admin Password *</label>
                  <input required type="password" value={provisionForm.admin_password}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, admin_password: e.target.value }))}
                    placeholder="password123" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Subscription Plan</label>
                  <select value={provisionForm.subscription_plan}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, subscription_plan: e.target.value as any }))}
                    className={inputCls}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Geofence Radius (m)</label>
                  <input type="number" min={50} max={500} value={provisionForm.geofence_default_radius}
                    onChange={(e) => setProvisionForm((p) => ({ ...p, geofence_default_radius: parseInt(e.target.value) }))}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProvisionModal(false)}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-600'}`}>
                  Cancel
                </button>
                <button type="submit" disabled={provisioning}
                  className="flex-1 py-2 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2">
                  {provisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {provisioning ? 'Provisioning…' : 'Onboard Tenant (201)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
