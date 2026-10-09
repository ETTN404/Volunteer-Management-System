import React, { useState } from 'react';
import {
  X,
  LogOut,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Shift, Attendance } from '../../types/vms';
import { ImpactScoreService } from '../../services/impactScoreService';
import { ApiClient } from '../../services/apiClient';

interface CheckOutModalProps {
  shift: Shift;
  attendance?: Attendance;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resultData: any) => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  shift,
  attendance,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [hoursWorked, setHoursWorked] = useState<number>(4.0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time preview of impact increment
  const previewIncrement = ImpactScoreService.calculateIncrement({
    hoursWorked: hoursWorked || 0,
    requiredSkillsCount: shift.required_skills?.length || 1,
    isOnTime: true,
    attendanceRate: 95,
  });

  const handlePerformCheckOut = async () => {
    setIsCheckingOut(true);
    setErrorMessage(null);

    const payload = {
      attendance_id: attendance?.id || 1,
      shift_id: shift.id,
      hours_worked: hoursWorked,
    };

    const res = await ApiClient.request('POST', '/api/volunteer/check-out', payload);

    setIsCheckingOut(false);
    if (res.status === 200) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMessage(res.error || 'Check-out failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">SHIFT CHECK-OUT & IMPACT SYNC</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[280px]">{shift.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Hours Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>VERIFIED SERVICE HOURS:</span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                className="w-28 bg-slate-900 text-white font-bold text-sm px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400">
                Scheduled Duration: ~4.0 hrs
              </span>
            </div>
          </div>

          {/* Impact Multipliers Calculation Preview (§6.2) */}
          <div className="bg-slate-900 p-3 rounded border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>IMPACT ENGINE MULTIPLIERS (§6.2)</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {previewIncrement.totalMultiplier}x BOOST
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Rate (0.1 pts/hr × {hoursWorked} hrs):</span>
                <span className="text-slate-200">+{previewIncrement.basePoints} pts</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>3+ Required Skills Bonus (+20%):</span>
                <span className="text-emerald-400">
                  {previewIncrement.multipliers.skillBonus ? '+20%' : '0%'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>On-Time GPS Check-in (+15%):</span>
                <span className="text-emerald-400">+15%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>High Attendance Rate (+10%):</span>
                <span className="text-emerald-400">+10%</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>TOTAL IMPACT EARNED:</span>
                <span className="text-xs text-emerald-400">
                  +{previewIncrement.totalEarned} PTS
                </span>
              </div>
            </div>
          </div>

          {/* Milestone Notification Hint */}
          <div className="p-2.5 bg-indigo-950/30 rounded border border-indigo-800/40 text-[10px] text-indigo-300 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong>MILESTONE CERTIFICATE AUTO-ISSUANCE (§14.2):</strong> Crossing 10, 25, 50, 100, 200, or 500 hours automatically generates accredited PDF credentials.
            </div>
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
              onClick={handlePerformCheckOut}
              disabled={isCheckingOut || hoursWorked <= 0}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded border border-indigo-400/40 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {isCheckingOut ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5" />
              )}
              <span>{isCheckingOut ? 'CALCULATING...' : 'CONFIRM CHECKOUT & LOG HOURS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
