import React from 'react';
import {
  Calendar,
  Users,
  Clock,
  QrCode,
  UserCheck,
  Radio,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { Event, Shift, ShiftAssignment, Attendance, Organization } from '../../types/vms';

interface CoordinatorDashboardProps {
  events: Event[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  attendances: Attendance[];
  org: Organization;
  onNavigateTab: (tab: string) => void;
  onOpenBroadcast: () => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  events,
  shifts,
  assignments,
  attendances,
  org,
  onNavigateTab,
  onOpenBroadcast,
}) => {
  const pendingApplications = assignments.filter((a) => a.status === 'applied');
  const activeAttendances = attendances.filter((a) => !a.check_out_time);
  const totalCompletedHours = attendances.reduce(
    (acc, a) => acc + (a.verified_hours || 0),
    0
  );

  return (
    <div className="space-y-3.5">
      {/* High Density Coordinator Control Bar */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              COORDINATOR COMMAND CENTER
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {org.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Real-time shift attendance, dynamic geofenced QR kiosk, and automated hours ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('live_shift')}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs border border-emerald-400/50 shadow-sm transition-all flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>LIVE QR KIOSK</span>
          </button>
          <button
            onClick={onOpenBroadcast}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs border border-rose-400/50 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>URGENT BROADCAST</span>
          </button>
        </div>
      </div>

      {/* 4 Operations Metric Cards (High Density) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab('events')}
          className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 hover:border-slate-600 cursor-pointer transition-all"
        >
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>ACTIVE EVENTS</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white">{events.length}</span>
            <span className="text-[10px] font-mono text-slate-400">EVENTS</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            {shifts.length} SHIFT SLOTS CONFIGURED
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('applications')}
          className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 hover:border-slate-600 cursor-pointer transition-all"
        >
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>PENDING CANDIDATES</span>
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-amber-400">
              {pendingApplications.length}
            </span>
            <span className="text-[10px] font-mono text-amber-400">QUEUED</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            AI MATCH SCORES COMPUTED
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('live_shift')}
          className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 hover:border-slate-600 cursor-pointer transition-all"
        >
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>ACTIVE ON-SITE</span>
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-cyan-400">
              {activeAttendances.length}
            </span>
            <span className="text-[10px] font-mono text-cyan-400">CHECKED IN</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            WITHIN GEOFENCE BOUNDS
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 hover:border-slate-600 cursor-pointer transition-all"
        >
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>VERIFIED HOURS</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {totalCompletedHours.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">HRS</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400">
            AUDITED SERVICE TIME
          </div>
        </div>
      </div>

      {/* Pending Applications Quick Action Alert */}
      {pendingApplications.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-white">
                {pendingApplications.length} CANDIDATE APPLICATION(S) AWAITING APPROVAL
              </span>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                AI Match engine calculated qualifications for registered candidates.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('applications')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded transition-colors shrink-0"
          >
            REVIEW CANDIDATES
          </button>
        </div>
      )}

      {/* Events & Shifts Summary Table (High Density) */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            PROGRAM EVENTS & ACTIVE SHIFTS
          </span>
          <button
            onClick={() => onNavigateTab('events')}
            className="text-[11px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>MANAGE ALL EVENTS</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {events.map((e) => {
            const eventShifts = shifts.filter((s) => s.event_id === e.id);

            return (
              <div
                key={e.id}
                className="bg-slate-900 border border-slate-700 rounded p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-indigo-400 border border-slate-700 uppercase">
                      {e.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{e.title}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {e.venue_name} • {e.start_date} • {e.geofence_radius}m GEOFENCE
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {eventShifts.length} SHIFTS
                  </span>
                  <button
                    onClick={() => onNavigateTab('live_shift')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-600 transition-colors"
                  >
                    ROSTER
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
