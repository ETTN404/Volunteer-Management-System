import React, { useState } from 'react';
import {
  X,
  Radio,
  Send,
  AlertTriangle,
  Users,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Shift, Event } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface UrgentBroadcastModalProps {
  shifts: Shift[];
  events: Event[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const UrgentBroadcastModal: React.FC<UrgentBroadcastModalProps> = ({
  shifts,
  events,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedShiftId, setSelectedShiftId] = useState<number>(shifts[0]?.id || 1);
  const [customMessage, setCustomMessage] = useState(
    'URGENT: Critical volunteer staffing shortage for upcoming community shift. If you possess matching skills and availability, please register immediately!'
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!isOpen) return null;

  const targetShift = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
  const targetEvent = targetShift ? events.find((e) => e.id === targetShift.event_id) : null;

  const handleDispatchBroadcast = async () => {
    if (!targetShift) return;
    setIsBroadcasting(true);

    const res = await ApiClient.request('POST', `/api/coordinator/shifts/${targetShift.id}/broadcast`, {
      custom_message: customMessage,
    });

    setIsBroadcasting(false);
    if (res.status === 200) {
      onSuccess(res.message || 'Urgent shift alert broadcasted successfully!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">EMERGENCY BROADCAST DISPATCHER</h3>
              <p className="text-[10px] text-slate-400">§16.2 Urgent Alert Subsystem</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Shift Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300">TARGET UNDERSTAFFED SHIFT:</label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(Number(e.target.value))}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-rose-500"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.start_time}) • Needs {s.required_skills.join(', ')}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Targeting Estimation */}
          <div className="p-3 bg-rose-950/40 rounded border border-rose-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-rose-300">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>TARGET ASSESSMENT</span>
              </span>
              <span className="bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800 text-[10px]">
                50 MATCHING VOLUNTEERS
              </span>
            </div>
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              Batch-dispatches in-app push alerts and SMTP email notices to all qualified volunteers in this organization without scheduling conflicts.
            </p>
          </div>

          {/* Custom Alert Message */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300">ALERT MESSAGE BODY:</label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-600"
            >
              CANCEL
            </button>
            <button
              onClick={handleDispatchBroadcast}
              disabled={isBroadcasting}
              className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded border border-rose-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBroadcasting ? 'DISPATCHING...' : 'DISPATCH BROADCAST'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
