import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  User,
  Activity,
  Code2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Award,
  FileSpreadsheet,
  QrCode,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Layers,
  Search,
  Server,
  Zap,
  Check,
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Organization } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentRole: 'superadmin' | 'orgadmin' | 'coordinator' | 'volunteer';
  onRoleChange: (role: 'superadmin' | 'orgadmin' | 'coordinator' | 'volunteer') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  organizations: Organization[];
  currentTenantId: number;
  onTenantChange: (orgId: number) => void;
  onOpenTester: () => void;
  onOpenPublicVerify: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  organizations = [],
  currentTenantId,
  onTenantChange,
  onOpenTester,
  onOpenPublicVerify,
  theme,
  onToggleTheme,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const orgList = organizations || [];
  const currentOrg = orgList.find((o) => o.id === currentTenantId) || orgList[0] || {
    id: 1,
    name: 'Hope Food Relief',
    subdomain: 'hope-food-relief',
    subscription_plan: 'enterprise',
  };

  const apiConfig = ApiClient.getConfig();
  const isLive = apiConfig.mode === 'live';

  const getTabsForRole = () => {
    switch (currentRole) {
      case 'volunteer':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Activity, badge: 'Active' },
          { id: 'browse', label: 'Browse Shifts', icon: Search, badge: 'Open' },
          { id: 'schedule', label: 'My Schedule', icon: Calendar, badge: 'Live' },
          { id: 'impact', label: 'Impact Score', icon: Sparkles, badge: 'Score' },
          { id: 'certificates', label: 'Certificates Hub', icon: Award, badge: 'Official' },
          { id: 'announcements', label: 'Announcements', icon: Zap, badge: 'Inbox' },
          { id: 'profile', label: 'Volunteer Profile', icon: User, badge: null },
          { id: 'chat', label: 'VolunBot AI', icon: HelpCircle, badge: 'AI' },
        ];
      case 'coordinator':
        return [
          { id: 'dashboard', label: 'Command Center', icon: Activity, badge: 'Realtime' },
          { id: 'events', label: 'Events & Shifts', icon: Calendar, badge: 'Master' },
          { id: 'live_shift', label: 'Live Kiosk & Geofence', icon: QrCode, badge: 'Geofenced' },
          { id: 'applications', label: 'Review Applicants', icon: UserCheck, badge: 'Queue' },
          { id: 'vol_directory', label: 'Volunteer Directory', icon: Users, badge: 'Directory' },
          { id: 'announcements_mgr', label: 'Announcements', icon: Zap, badge: 'Broadcast' },
          { id: 'announcements', label: 'Announcement Inbox', icon: Server, badge: 'All' },
          { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, badge: 'Async' },
        ];
      case 'superadmin':
        return [
          { id: 'dashboard', label: 'Tenancy Overview', icon: Layers, badge: 'Tenants' },
          { id: 'users', label: 'User Directory & RBAC', icon: Users, badge: 'RBAC' },
          { id: 'audits', label: 'SOC-2 Audit Trail', icon: FileText, badge: 'Immutable' },
          { id: 'announcements', label: 'Announcement Inbox', icon: Zap, badge: 'All' },
        ];
      case 'orgadmin':
        return [
          { id: 'dashboard', label: 'Organization Portal', icon: Building2, badge: 'Org' },
          { id: 'announcements', label: 'Announcement Inbox', icon: Zap, badge: 'All' },
          { id: 'audits', label: 'SOC-2 Audit Trail', icon: FileText, badge: 'Immutable' },
        ];
    }
  };

  const tabs = getTabsForRole();

  const isDark = theme === 'dark';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out font-mono border-r select-none ${
          isDark
            ? 'bg-[#131d2e] border-slate-700/80 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        } ${isCollapsed ? 'w-18' : 'w-64'} ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Header Section */}
        <div
          className={`h-14 flex items-center justify-between px-3 border-b shrink-0 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-md bg-indigo-600 border border-indigo-500/50 flex items-center justify-center text-white shrink-0 shadow-xs shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>

            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="font-bold text-xs tracking-tight uppercase">
                    VOLUNTRACK<span className="text-indigo-500 font-normal">::VMS</span>
                  </span>
                  <span
                    className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    PROD
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">
                  Laravel + MySQL Backend
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar'}
            className={`hidden lg:flex items-center justify-center h-6 w-6 rounded text-slate-400 hover:text-white transition-colors ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Tenant Organization Switcher */}
        <div
          className={`p-2.5 border-b shrink-0 ${
            isDark ? 'border-slate-800/80 bg-[#162235]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          {isCollapsed ? (
            <div
              title={`Tenant: ${currentOrg.name} (${currentOrg.subscription_plan || 'pro'})`}
              className={`w-full py-1.5 flex flex-col items-center justify-center rounded cursor-pointer ${
                isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
              }`}
              onClick={() => onToggleCollapse()}
            >
              <Building2 className="w-4 h-4 text-indigo-400 mb-0.5" />
              <span className="text-[9px] font-bold text-indigo-400">
                {(currentOrg.name || 'ORG').substring(0, 2).toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="relative">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>TENANT CONTEXT (§1.1):</span>
                <span className="text-indigo-400 font-bold uppercase text-[8px] px-1 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20">
                  {currentOrg.subscription_plan || 'pro'}
                </span>
              </div>
              <button
                onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                className={`w-full text-left p-1.5 rounded flex items-center justify-between gap-1.5 border transition-colors ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-indigo-500'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-5 h-5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {(currentOrg.name || 'ORG').substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold truncate">{currentOrg.name}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isTenantDropdownOpen && (
                <div
                  className={`absolute left-0 right-0 top-full mt-1 z-50 rounded border shadow-xl p-1 max-h-48 overflow-y-auto ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {orgList.map((org) => {
                    const isSelected = org.id === currentTenantId;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          onTenantChange(org.id);
                          setIsTenantDropdownOpen(false);
                        }}
                        className={`w-full text-left p-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : isDark
                            ? 'hover:bg-slate-800 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate text-xs font-medium">{org.name}</div>
                          <div
                            className={`text-[9px] truncate ${
                              isSelected ? 'text-indigo-200' : 'text-slate-500'
                            }`}
                          >
                            {org.subdomain || org.slug}.voluntrack.org
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Switcher Matrix */}
        <div
          className={`p-2.5 border-b shrink-0 ${
            isDark ? 'border-slate-800 bg-[#111c2c]' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          {isCollapsed ? (
            <div
              title={`Active Role: ${currentRole.toUpperCase()}`}
              className="flex justify-center"
              onClick={() => onToggleCollapse()}
            >
              <span
                className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer ${
                  currentRole === 'admin'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : currentRole === 'coordinator'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {currentRole === 'admin' ? 'AD' : currentRole === 'coordinator' ? 'CO' : 'VO'}
              </span>
            </div>
          ) : (
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                RBAC ACTIVE ROLE:
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'volunteer', label: 'VOLUNTEER', color: 'emerald' },
                  { id: 'coordinator', label: 'COORD', color: 'indigo' },
                  { id: 'orgadmin', label: 'ORG ADMIN', color: 'rose' },
                  { id: 'superadmin', label: 'SYS ADMIN', color: 'amber' },
                ].map((r) => {
                  const isSelected = currentRole === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => onRoleChange(r.id as any)}
                      className={`py-1 px-0.5 rounded text-[10px] font-bold uppercase transition-all border text-center ${
                        isSelected
                          ? r.id === 'orgadmin'
                            ? 'bg-rose-600 text-white border-rose-400/60 shadow-xs'
                            : r.id === 'superadmin'
                            ? 'bg-amber-600 text-white border-amber-400/60 shadow-xs'
                            : r.id === 'coordinator'
                            ? 'bg-indigo-600 text-white border-indigo-400/60 shadow-xs'
                            : 'bg-emerald-600 text-white border-emerald-400/60 shadow-xs'
                          : isDark
                          ? 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!isCollapsed && (
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              NAVIGATION MODULES
            </div>
          )}

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                title={isCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                />

                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          isActive
                            ? 'bg-indigo-800/80 text-indigo-100 border border-indigo-400/40'
                            : isDark
                            ? 'bg-slate-900 text-slate-400 border border-slate-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Utility Tools & Status */}
        <div
          className={`p-2 border-t shrink-0 space-y-1.5 ${
            isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          {/* API Test Console Trigger */}
          <button
            onClick={() => onOpenTester()}
            title={isCollapsed ? 'API & Phase 1-9 Test Matrix' : undefined}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-bold border transition-all ${
              isDark
                ? 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/60'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate text-[11px]">API Test Workbench</span>
                <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  9 PHASES
                </span>
              </>
            )}
          </button>

          {/* Public Certificate Verification Trigger */}
          <button
            onClick={() => onOpenPublicVerify()}
            title={isCollapsed ? 'Public Certificate Verification Registry' : undefined}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <span className="flex-1 text-left truncate text-[11px]">Public Verify Portal</span>
            )}
          </button>

          {/* Theme Switcher & Connection Indicator */}
          <div className="pt-1 flex items-center justify-between gap-1">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[10px] font-bold border transition-colors ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-600" />}
              {!isCollapsed && <span>{isDark ? 'LIGHT MODE' : 'DARK MODE'}</span>}
            </button>

            {/* Live / Mock Indicator */}
            {!isCollapsed ? (
              <div
                title={isLive ? `Live Backend: ${apiConfig.liveBaseUrl}` : 'Running Mock Sandbox'}
                className={`px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 border ${
                  isLive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>{isLive ? 'LIVE BACKEND' : 'MOCK ENGINE'}</span>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
};
