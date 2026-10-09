import React from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  User,
  Activity,
  Bell,
  Code2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Award,
  FileSpreadsheet,
  QrCode,
  Radio,
  FileText,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Search,
} from 'lucide-react';
import { Organization } from '../../types/vms';

interface TopNavbarProps {
  currentRole: 'admin' | 'coordinator' | 'volunteer';
  onRoleChange: (role: 'admin' | 'coordinator' | 'volunteer') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  organizations: Organization[];
  currentTenantId: number;
  onTenantChange: (orgId: number) => void;
  onOpenTester: () => void;
  onOpenPublicVerify: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  organizations,
  currentTenantId,
  onTenantChange,
  onOpenTester,
  onOpenPublicVerify,
}) => {
  const currentOrg = organizations.find((o) => o.id === currentTenantId) || organizations[0];

  // Role-specific navigation tabs with high density badge count / status
  const getTabsForRole = () => {
    switch (currentRole) {
      case 'volunteer':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Activity, badge: 'Active' },
          { id: 'browse', label: 'Browse Shifts', icon: Search, badge: 'Open' },
          { id: 'schedule', label: 'My Schedule', icon: Calendar, badge: 'Live' },
          { id: 'certificates', label: 'Certificates', icon: Award, badge: 'Official' },
          { id: 'profile', label: 'Profile & Skills', icon: User, badge: null },
          { id: 'chat', label: 'VolunBot AI', icon: Sparkles, badge: 'AI-2.5' },
        ];
      case 'coordinator':
        return [
          { id: 'dashboard', label: 'Command Center', icon: Activity, badge: 'Realtime' },
          { id: 'events', label: 'Events & Shifts', icon: Calendar, badge: 'Master' },
          { id: 'live_shift', label: 'Live Kiosk & Geofence', icon: QrCode, badge: 'Geofenced' },
          { id: 'applications', label: 'Review Applications', icon: UserCheck, badge: 'Queue' },
          { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, badge: 'Async' },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Multi-Tenant Overview', icon: Layers, badge: 'Tenants' },
          { id: 'users', label: 'User & RBAC Manager', icon: Users, badge: 'RBAC' },
          { id: 'audits', label: 'SOC-2 Audit Trail', icon: FileText, badge: 'Immutable' },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <header className="bg-[#1e293b] border-b border-slate-700 sticky top-0 z-40 shrink-0">
      {/* Top Main High-Density Header (h-14) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-3">
        {/* Left: Brand + System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 border border-indigo-500/50 flex items-center justify-center shadow-md shadow-indigo-600/30 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white tracking-tight">
                  VOLUNTRACK<span className="text-indigo-400 font-normal">::VMS</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                  v4.0.12-PROD
                </span>
              </div>
            </div>
          </div>

          {/* System Nominal Indicator */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-700/80">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
              ALL SYSTEMS NOMINAL
            </span>
          </div>

          {/* Multi-Tenant Switcher */}
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-700/80 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenant:</span>
            <select
              value={currentTenantId}
              onChange={(e) => onTenantChange(Number(e.target.value))}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.status === 'suspended' ? '[SUSPENDED]' : `(${org.slug})`}
                </option>
              ))}
            </select>
            {currentOrg?.status === 'suspended' && (
              <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800 uppercase">
                SUSPENDED
              </span>
            )}
          </div>
        </div>

        {/* Center: Role Switcher Buttons */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700 shrink-0">
          {(
            [
              { id: 'volunteer', label: 'VOLUNTEER', icon: User },
              { id: 'coordinator', label: 'COORDINATOR', icon: UserCheck },
              { id: 'admin', label: 'ORG ADMIN', icon: ShieldCheck },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = currentRole === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onRoleChange(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Public Verify & Master API Tester Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Public Certificate Verify Trigger */}
          <button
            onClick={onOpenPublicVerify}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/60 text-[11px] font-mono transition-colors"
            title="Public Verification Portal (No Auth Required)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>VERIFY CERT</span>
          </button>

          {/* Master API Test Console */}
          <button
            onClick={onOpenTester}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-400/50 shadow-md shadow-indigo-600/20 text-[11px] font-mono font-bold transition-all group"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-200 group-hover:rotate-12 transition-transform" />
            <span>API TESTER</span>
            <span className="px-1 py-0.2 rounded bg-indigo-950 text-[9px] font-mono border border-indigo-500/40">
              PHASES 1-9
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Header High-Density Navigation Tab Bar */}
      <div className="bg-[#0f172a] border-t border-slate-800/90 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none py-1.5 gap-2">
          <div className="flex items-center gap-1 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Sub-telemetry Pill */}
          <div className="hidden xl:flex items-center gap-3 text-[10px] font-mono text-slate-400 shrink-0">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-400" />
              <span>CLUSTER: node-us-east-1</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">LATENCY: 18ms</span>
          </div>
        </div>
      </div>
    </header>
  );
};
