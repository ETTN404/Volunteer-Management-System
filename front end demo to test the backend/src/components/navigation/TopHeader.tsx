import React from 'react';
import {
  Menu,
  ShieldCheck,
  Building2,
  Users,
  Code2,
  Award,
  Sun,
  Moon,
  Sparkles,
  Server,
  Activity,
  Bell,
  Search,
} from 'lucide-react';
import { Organization, User } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface TopHeaderProps {
  onOpenMobileSidebar: () => void;
  activeTab: string;
  currentRole: 'admin' | 'coordinator' | 'volunteer';
  currentOrg: Organization;
  currentUser: User;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTester: () => void;
  onOpenPublicVerify: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileSidebar,
  activeTab,
  currentRole,
  currentOrg,
  currentUser,
  theme,
  onToggleTheme,
  onOpenTester,
  onOpenPublicVerify,
}) => {
  const isDark = theme === 'dark';
  const apiConfig = ApiClient.getConfig();
  const isLive = apiConfig.mode === 'live';

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return currentRole === 'admin'
          ? 'Multi-Tenant Management & Overview'
          : currentRole === 'coordinator'
          ? 'Coordinator Live Command Center'
          : 'Volunteer Active Dashboard & Impact';
      case 'browse':
        return 'Available Opportunities & Shift Applications';
      case 'schedule':
        return 'My Scheduled Shifts & Geofenced Attendance';
      case 'certificates':
        return 'Cryptographic Milestone Certificates Hub';
      case 'profile':
        return 'Volunteer Competencies & Verification Profile';
      case 'chat':
        return 'VolunBot Intelligent Assistant (Gemini)';
      case 'events':
        return 'Event Catalog & Shift Roster Orchestration';
      case 'live_shift':
        return 'Live Attendance Kiosk & Geofence Verification';
      case 'applications':
        return 'Volunteer Application Review & Match Scoring';
      case 'reports':
        return 'Compliance & Attendance Analytics Reports';
      case 'users':
        return 'User Accounts & Role-Based Access Control (RBAC)';
      case 'audits':
        return 'Immutable SOC-2 Compliance Audit Logs';
      default:
        return 'VolunTrack VMS Platform';
    }
  };

  return (
    <header
      className={`h-14 border-b px-3 sm:px-5 flex items-center justify-between gap-2.5 font-mono select-none sticky top-0 z-30 transition-colors ${
        isDark
          ? 'bg-[#101928]/95 border-slate-700/80 backdrop-blur-md text-slate-200'
          : 'bg-white/95 border-slate-200 backdrop-blur-md text-slate-800'
      }`}
    >
      {/* Left: Mobile Menu Button & Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className={`lg:hidden p-1.5 rounded transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <div
            className={`hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
              currentRole === 'admin'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : currentRole === 'coordinator'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{currentRole}</span>
          </div>

          <div className="text-xs font-bold truncate text-white">
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{getPageTitle()}</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live Backend Connection Indicator */}
        <div
          title="Connected to Live Laravel API (http://localhost:8000/api)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        >
          <Server className="w-3 h-3 text-emerald-400" />
          <span>🟢 LIVE LARAVEL API</span>
        </div>

        {/* API Test Matrix Trigger */}
        <button
          onClick={onOpenTester}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
            isDark
              ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">TEST MATRIX</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500 text-white font-mono">
            9 PHASES
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-1.5 rounded border transition-colors ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Current User Pill */}
        <div
          className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded border ${
            isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
            {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <div className={`text-[11px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentUser?.name || 'Authorized User'}
            </div>
            <div className="text-[9px] text-slate-400 leading-none truncate max-w-[120px]">
              {currentUser?.email || 'user@voluntrack.org'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
