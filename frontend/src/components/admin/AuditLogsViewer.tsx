import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Building2,
  User,
  Clock,
  Loader2,
  RefreshCw,
  UserPlus,
  Edit3,
  Megaphone,
  Calendar,
  CheckCircle2,
  Activity,
  Globe,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AuditLog } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';
import { VmsStore } from '../../services/vmsStore';

interface AuditLogsViewerProps {
  logs?: AuditLog[];
}

// Helper to resolve the target organization name
const resolveOrgName = (log: AuditLog): string => {
  const newVals = log.new_values || {};
  const oldVals = log.old_values || {};

  if (newVals.org_name) return newVals.org_name;
  if (newVals.name) return newVals.name;
  if (oldVals.org_name) return oldVals.org_name;
  if (oldVals.name) return oldVals.name;

  // Try store lookup by ID
  if (log.model_id) {
    const orgs = VmsStore.get().organizations || [];
    const found = orgs.find((o) => Number(o.id) === Number(log.model_id));
    if (found?.name) return found.name;
  }

  return log.model_id ? `Organization #${log.model_id}` : 'Organization';
};

// Convert raw log actions & payload into plain English activity sentences with target names
const getHumanReadableSummary = (log: AuditLog) => {
  const act = (log.action || '').toLowerCase();
  const newVals = log.new_values || {};
  const oldVals = log.old_values || {};
  const targetName = resolveOrgName(log);

  if (act.includes('tenant.status') || act.includes('status_updated')) {
    const newStatus = newVals.status || 'updated';
    if (newStatus === 'suspended') {
      return {
        title: `Suspended Organization '${targetName}'`,
        description: `Status for '${targetName}' was changed to Suspended`,
        note: `System Administrator suspended '${targetName}' (ID: ${log.model_id || 'N/A'}). Access for this organization and its admins has been paused.`,
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        icon: ShieldAlert,
      };
    }
    if (newStatus === 'active') {
      return {
        title: `Reactivated Organization '${targetName}'`,
        description: `Status for '${targetName}' was changed back to Active`,
        note: `System Administrator reactivated '${targetName}' (ID: ${log.model_id || 'N/A'}). Full access has been restored.`,
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    return {
      title: `Updated Organization '${targetName}'`,
      description: `Organization status changed to ${newStatus}`,
      note: `Updated settings for '${targetName}'.`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Building2,
    };
  }

  if (act.includes('tenant.onboard') || act.includes('onboarded')) {
    return {
      title: `Onboarded New Organization '${targetName}'`,
      description: `Provisioned new tenant organization '${targetName}'`,
      note: `Successfully onboarded '${targetName}' into the system with tenant administrator access.`,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: Building2,
    };
  }

  if (act.includes('organization.update')) {
    return {
      title: `Updated Profile for '${targetName}'`,
      description: `Edited profile information for '${targetName}'`,
      note: `Updated contact, address, or organization profile details for '${targetName}'.`,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      icon: Edit3,
    };
  }

  if (act.includes('coordinator_created') || act.includes('user.created')) {
    const staffName = newVals.full_name || newVals.name || newVals.email || 'Coordinator';
    return {
      title: `Added Staff Coordinator '${staffName}'`,
      description: `Registered new coordinator staff account for '${staffName}'`,
      note: `Created new staff account for ${staffName} with coordinator privileges.`,
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: UserPlus,
    };
  }

  if (act.includes('event')) {
    return {
      title: 'Modified Volunteer Event',
      description: `Updated event schedule or location details`,
      note: `Event parameters, dates, or geofence settings were updated.`,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: Calendar,
    };
  }

  if (act.includes('broadcast')) {
    return {
      title: 'Sent Urgent Shift Broadcast',
      description: `Dispatched emergency notification to volunteers`,
      note: `Emergency SMS and push broadcast sent to all assigned volunteers.`,
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Megaphone,
    };
  }

  return {
    title: 'System Activity Logged',
    description: `Activity logged for ${log.model_type || 'platform'}`,
    note: `Recorded system activity for model ${log.model_type || 'system'}.`,
    badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    icon: Activity,
  };
};

export const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({ logs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [liveLogs, setLiveLogs] = useState<AuditLog[]>(logs);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('GET', '/superadmin/audit-logs');
      if (res.status === 200 && Array.isArray(res.data)) {
        setLiveLogs(res.data);
      } else if (res.status === 200 && Array.isArray(res.data?.data)) {
        setLiveLogs(res.data.data);
      }
    } catch {
      // Keep existing logs on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const displayLogs = liveLogs.length > 0 ? liveLogs : logs;

  const filteredLogs = (displayLogs || []).filter((log) => {
    const summary = getHumanReadableSummary(log);
    const searchLower = searchTerm.toLowerCase();

    return (
      summary.title.toLowerCase().includes(searchLower) ||
      summary.description.toLowerCase().includes(searchLower) ||
      summary.note.toLowerCase().includes(searchLower) ||
      String(log.ip_address || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#131d2e] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Audit Activity Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time record of administrative actions, organization changes, and user updates. Click any row to expand details.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh Log
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#131d2e] p-3 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by organization name, action, or IP..."
            className="w-full bg-slate-900/90 text-slate-200 text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Activity Log List */}
      <div className="bg-[#131d2e] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No activity records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 text-xs">
            {filteredLogs.map((log) => {
              const summary = getHumanReadableSummary(log);
              const Icon = summary.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div key={log.id} className="transition-colors hover:bg-slate-800/20">
                  {/* Row Summary Bar */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${summary.badgeColor}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>

                      <div>
                        <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                          <span>{summary.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{summary.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-xs shrink-0 self-end md:self-center">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>System Administrator</span>
                      </div>
                      <span className="text-slate-600">•</span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>{String(log.ip_address || '127.0.0.1')}</span>
                      </div>
                      <span className="text-slate-600">•</span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.created_at}</span>
                      </div>

                      <div className="text-slate-400 ml-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Clean, Seamless Expanded Note (No dark boxes or surrounding lines) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 ml-12 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
                      <div className="flex items-start gap-2 text-slate-300">
                        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-semibold text-slate-100">Note: </span>
                          <span>{summary.note}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 pl-6">
                        Action performed on <span className="text-slate-300 font-medium">{log.created_at}</span> from IP address <span className="text-slate-300 font-medium">{String(log.ip_address || '127.0.0.1')}</span>.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
