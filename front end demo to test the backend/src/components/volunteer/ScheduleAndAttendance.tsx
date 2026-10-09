import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { ShiftAssignment, Shift, Event, Attendance } from '../../types/vms';

interface ScheduleAndAttendanceProps {
  assignments: ShiftAssignment[];
  shifts: Shift[];
  events: Event[];
  attendances: Attendance[];
  onOpenCheckIn: (shift: Shift, event: Event) => void;
  onOpenCheckOut: (shift: Shift, attendance?: Attendance) => void;
}

export const ScheduleAndAttendance: React.FC<ScheduleAndAttendanceProps> = ({
  assignments,
  shifts,
  events,
  attendances,
  onOpenCheckIn,
  onOpenCheckOut,
}) => {
  return (
    <div className="space-y-3.5">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              MY SCHEDULE & ATTENDANCE ROSTER
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {assignments.length} ASSIGNED
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Geofenced check-in verifies arrival within target venue perimeter.
          </p>
        </div>
      </div>

      {/* Shifts List (High Density) */}
      <div className="space-y-2.5">
        {assignments.length === 0 ? (
          <div className="bg-[#1e293b] p-8 rounded-lg border border-slate-700 text-center text-slate-400 space-y-1.5">
            <Calendar className="w-6 h-6 text-slate-600 mx-auto" />
            <div className="text-xs font-mono font-bold text-slate-300">NO SHIFTS SCHEDULED</div>
            <p className="text-[11px] font-mono">Browse available opportunities to register for volunteer shifts.</p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const shift = shifts.find((s) => s.id === assignment.shift_id);
            const event = shift ? events.find((e) => e.id === shift.event_id) : null;
            const attendance = attendances.find((a) => a.shift_id === assignment.shift_id);
            const isCheckedIn = assignment.status === 'checked_in' || (attendance && !attendance.check_out_time);
            const isCompleted = assignment.status === 'completed' || (attendance && attendance.check_out_time);

            if (!shift || !event) return null;

            return (
              <div
                key={assignment.id}
                className={`bg-[#1e293b] border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                  isCheckedIn
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : isCompleted
                    ? 'border-slate-700 opacity-90'
                    : 'border-slate-700'
                }`}
              >
                {/* Shift Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isCheckedIn
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : isCompleted
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                          : assignment.status === 'approved'
                          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isCheckedIn ? 'ACTIVE CHECKED-IN' : assignment.status.toUpperCase()}
                    </span>
                    <h3 className="text-xs font-mono font-bold text-white">{shift.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      {shift.start_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      {event.venue_name} ({event.geofence_radius}m radius)
                    </span>
                  </div>

                  {assignment.coordinator_feedback && (
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      FEEDBACK: {assignment.coordinator_feedback}
                    </div>
                  )}
                </div>

                {/* Actions & Verified Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  {isCheckedIn ? (
                    <button
                      onClick={() => onOpenCheckOut(shift, attendance)}
                      className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs border border-amber-400/50 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>CHECK OUT & LOG HOURS</span>
                    </button>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>VERIFIED ({attendance?.hours_worked ?? 4.0} HRS)</span>
                    </div>
                  ) : assignment.status === 'approved' ? (
                    <button
                      onClick={() => onOpenCheckIn(shift, event)}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs border border-emerald-400/50 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR CHECK-IN</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>PENDING REVIEW</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
