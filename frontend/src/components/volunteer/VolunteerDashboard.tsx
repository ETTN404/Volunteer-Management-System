import React from 'react';
import {
  Award,
  Clock,
  TrendingUp,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Bot,
  Flame,
  Activity,
  Zap,
} from 'lucide-react';
import { Volunteer, User, Event, Shift, Certificate, Organization } from '../../types/vms';
import { ImpactScoreService } from '../../services/impactScoreService';

interface VolunteerDashboardProps {
  volunteer: Volunteer;
  user: User;
  org: Organization;
  upcomingShifts: Shift[];
  events: Event[];
  certificates: Certificate[];
  onNavigateTab: (tab: string) => void;
  onOpenCheckIn: (shift: Shift, event: Event) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  volunteer,
  user,
  org,
  upcomingShifts,
  events,
  certificates,
  onNavigateTab,
  onOpenCheckIn,
}) => {
  const milestone = ImpactScoreService.getMilestoneProgress(volunteer.total_hours);
  const nextShift = upcomingShifts[0];
  const nextEvent = nextShift ? events.find((e) => e.id === nextShift.event_id) : null;

  return (
    <div className="space-y-3.5">
      {/* High Density Top Control / Status Banner */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm shrink-0">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {user.name}
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE MEMBER
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>{org.name}</span>
              <span className="text-slate-600">/</span>
              <span>VOLUNTEER_ID: #{volunteer.id.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigateTab('browse')}
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs border border-indigo-400/40 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>BROWSE SHIFTS</span>
          </button>
          <button
            onClick={() => onNavigateTab('chat')}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-semibold text-xs border border-slate-600 transition-all flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI ASSISTANT</span>
          </button>
        </div>
      </div>

      {/* 4 High-Density Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Verified Hours */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 relative group hover:border-slate-600 transition-all">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>VERIFIED HOURS</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {volunteer.total_hours.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">HRS</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>CRYPTO SEALED</span>
          </div>
        </div>

        {/* Impact Score */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 relative group hover:border-slate-600 transition-all">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>IMPACT SCORE</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {volunteer.impact_score.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">/ 100</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>1.35x MULTIPLIER</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 relative group hover:border-slate-600 transition-all">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>ATTENDANCE</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {volunteer.attendance_rate}%
            </span>
            <span className="text-[10px] font-mono text-teal-400">RELIABLE</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-teal-400" />
            <span>0 MISSED SHIFTS</span>
          </div>
        </div>

        {/* Milestone Certificates */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 relative group hover:border-slate-600 transition-all">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>CERTIFICATES</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white tracking-tight">
              {certificates.length}
            </span>
            <span className="text-[10px] font-mono text-amber-400">ISSUED</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>SHA-256 HASHED</span>
          </div>
        </div>
      </div>

      {/* High Density Milestone Progress Card */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-white">
              MILESTONE TARGET: {milestone.nextMilestone} HOURS OFFICIAL CERTIFICATE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {milestone.hoursToNext}h REMAINING
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('certificates')}
            className="text-[11px] font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>VIEW ALL CERTIFICATES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>PROGRESS: {volunteer.total_hours} / {milestone.nextMilestone} HRS</span>
            <span>{milestone.progressPercent.toFixed(0)}% COMPLETED</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded transition-all duration-300"
              style={{ width: `${milestone.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Active Shift High Density Card */}
      {nextShift && nextEvent ? (
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  NEXT SCHEDULED SHIFT
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {nextShift.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                EVENT: {nextEvent.title} • VENUE: {nextEvent.venue_name}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-300 pt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {nextShift.start_time}
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {nextEvent.venue_address} ({nextEvent.geofence_radius}m GEOFENCE)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenCheckIn(nextShift, nextEvent)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded border border-emerald-400/50 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>LAUNCH QR CHECK-IN</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-xs font-mono text-slate-400">No shifts scheduled right now.</p>
          <button
            onClick={() => onNavigateTab('browse')}
            className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded"
          >
            BROWSE UPCOMING EVENTS
          </button>
        </div>
      )}
    </div>
  );
};
