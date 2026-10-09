import React, { useState, useEffect } from 'react';
import {
  QrCode,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Shift, Event, ShiftAssignment, Attendance, User, Volunteer } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';
import { VmsStore } from '../../services/vmsStore';

interface LiveShiftAttendanceProps {
  shifts: Shift[];
  events: Event[];
  assignments: ShiftAssignment[];
  attendances: Attendance[];
  volunteers: Volunteer[];
  users: User[];
  onDataChanged: () => void;
}

export const LiveShiftAttendance: React.FC<LiveShiftAttendanceProps> = ({
  shifts,
  events,
  assignments,
  attendances,
  volunteers,
  users,
  onDataChanged,
}) => {
  const [selectedShiftId, setSelectedShiftId] = useState<number>(shifts[0]?.id || 1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [isForceModalOpen, setIsForceModalOpen] = useState(false);
  const [selectedVolunteerForOverride, setSelectedVolunteerForOverride] = useState<number>(1);
  const [overrideReason, setOverrideReason] = useState('Volunteer smartphone battery depleted on site.');

  const activeShift = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
  const activeEvent = activeShift ? events.find((e) => e.id === activeShift.event_id) : null;

  // 15-minute countdown timer (§12.1)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Refresh QR
  const handleRegenerateQr = async () => {
    if (!activeShift) return;
    setIsRefreshingQr(true);
    await ApiClient.request('POST', `/api/coordinator/shifts/${activeShift.id}/qrcode`);
    setSecondsRemaining(15 * 60);
    setIsRefreshingQr(false);
    onDataChanged();
  };

  // Manual Force Check-In Override (§8.1)
  const handleForceCheckIn = async () => {
    if (!activeShift) return;
    const db = VmsStore.get();
    const volunteer = db.volunteers.find((v) => v.id === selectedVolunteerForOverride) || db.volunteers[0];

    const newAttendance: Attendance = {
      id: db.attendances.length + 1,
      shift_id: activeShift.id,
      volunteer_id: volunteer.id,
      check_in_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      check_in_lat: activeEvent?.latitude || 37.7749,
      check_in_lon: activeEvent?.longitude || -122.4194,
      distance_from_venue_meters: 0,
      is_within_geofence: true,
      verification_method: 'coordinator_force_override',
      override_reason: overrideReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.attendances.push(newAttendance);

    const assign = db.shiftAssignments.find((a) => a.shift_id === activeShift.id && a.volunteer_id === volunteer.id);
    if (assign) assign.status = 'checked_in';

    VmsStore.save();
    VmsStore.logAudit({
      action: 'attendance.force_override',
      modelType: 'Attendance',
      modelId: newAttendance.id,
      newValues: { shift_id: activeShift.id, volunteer_id: volunteer.id, reason: overrideReason },
    });

    setIsForceModalOpen(false);
    onDataChanged();
  };

  const shiftAttendances = attendances.filter((a) => a.shift_id === activeShift?.id);

  return (
    <div className="space-y-3.5 font-mono">
      {/* Header & Shift Selector */}
      <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              LIVE SHIFT QR TERMINAL & ROSTER
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Signed dynamic QR tokens rotate every 15 minutes to prevent remote proxy clocking.
          </p>
        </div>

        {/* Shift selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">ACTIVE SHIFT:</span>
          <select
            value={selectedShiftId}
            onChange={(e) => {
              setSelectedShiftId(Number(e.target.value));
              setSecondsRemaining(15 * 60);
            }}
            className="bg-slate-900 text-indigo-400 font-bold border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.start_time.substring(11, 16)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeShift && activeEvent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Left Column: Signed QR Code Terminal */}
          <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-3 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SIGNED TOKEN ACTIVE</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className={secondsRemaining < 120 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-300'}>
                  ROTATION: {formatTime(secondsRemaining)}
                </span>
              </div>
            </div>

            {/* Compact QR Canvas */}
            <div className="bg-white p-3 rounded shadow-md border-2 border-slate-700">
              <div className="w-40 h-40 border-2 border-slate-900 grid grid-cols-6 gap-1 p-1.5 bg-slate-50">
                <div className="bg-slate-900 col-span-2 row-span-2 rounded-sm" />
                <div className="bg-slate-900 col-span-1 row-span-1 rounded-sm" />
                <div className="bg-slate-900 col-span-1 row-span-1 rounded-sm" />
                <div className="bg-slate-900 col-span-2 row-span-2 rounded-sm" />
                <div className="bg-slate-900 col-span-1 row-span-2 rounded-sm" />
                <div className="bg-slate-900 col-span-2 row-span-1 rounded-sm" />
                <div className="bg-slate-900 col-span-1 row-span-1 rounded-sm" />
                <div className="bg-slate-900 col-span-2 row-span-2 rounded-sm" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-300">
                {activeShift.qr_code_signature || 'QR_SIG_8F93A04B11E7'}
              </div>
              <div className="text-[10px] text-slate-400">
                GEOFENCE: {activeEvent.geofence_radius}m radius around {activeEvent.venue_name}
              </div>
            </div>

            {/* Refresh QR button */}
            <button
              onClick={handleRegenerateQr}
              disabled={isRefreshingQr}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? 'animate-spin' : ''}`} />
              <span>ROTATE SIGNATURE KEY</span>
            </button>
          </div>

          {/* Right Column: Live Attendance List & Manual Override */}
          <div className="lg:col-span-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                SHIFT ROSTER ({shiftAttendances.length} / {activeShift.capacity} VOLUNTEERS CHECKED IN)
              </span>
              <button
                onClick={() => setIsForceModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-sm transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>OVERRIDE CHECK-IN</span>
              </button>
            </div>

            {/* Roster Cards (High Density) */}
            <div className="space-y-2">
              {shiftAttendances.length === 0 ? (
                <div className="bg-[#1e293b] p-6 rounded-lg border border-slate-700 text-center text-slate-400 text-xs">
                  No volunteers checked in yet. Volunteers scan the QR to register attendance.
                </div>
              ) : (
                shiftAttendances.map((att) => {
                  const vol = volunteers.find((v) => v.id === att.volunteer_id);
                  const u = vol ? users.find((user) => user.id === vol.user_id) : null;

                  return (
                    <div
                      key={att.id}
                      className="bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                          {u?.name.substring(0, 2).toUpperCase() || 'VO'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{u?.name || 'Volunteer'}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>CHECK-IN: {att.check_in_time.substring(11, 16)}</span>
                            <span>•</span>
                            <span className="text-emerald-400">
                              {att.verification_method === 'coordinator_force_override'
                                ? 'OVERRIDE VERIFIED'
                                : `${att.distance_from_venue_meters}m FROM VENUE`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {att.check_out_time ? 'COMPLETED' : 'ON-SITE ACTIVE'}
                        </span>
                        {att.override_reason && (
                          <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                            {att.override_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Force Check-In Modal (§8.1) */}
      {isForceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-md p-4 space-y-3 shadow-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">MANUAL CHECK-IN OVERRIDE</h3>
            <p className="text-[11px] text-slate-400">
              For volunteers unable to use smartphone GPS or QR scanner. An immutable audit record will be logged.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">SELECT VOLUNTEER:</label>
                <select
                  value={selectedVolunteerForOverride}
                  onChange={(e) => setSelectedVolunteerForOverride(Number(e.target.value))}
                  className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700"
                >
                  {volunteers.map((v) => {
                    const u = users.find((user) => user.id === v.user_id);
                    return (
                      <option key={v.id} value={v.id}>
                        {u?.name || `Volunteer #${v.id}`} ({u?.email})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1">AUDIT OVERRIDE REASON:</label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setIsForceModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded border border-slate-600"
              >
                CANCEL
              </button>
              <button
                onClick={handleForceCheckIn}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400/40"
              >
                CONFIRM OVERRIDE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
