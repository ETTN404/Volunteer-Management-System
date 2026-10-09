import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Check,
  X,
  Bot,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ShiftAssignment, Shift, Volunteer, User } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface ApplicationReviewProps {
  assignments: ShiftAssignment[];
  shifts: Shift[];
  volunteers: Volunteer[];
  users: User[];
  onDataChanged: () => void;
}

interface AiFeedback {
  match_score: number;
  recommendation: string;
  strengths: string[];
  gaps: string[];
}

export const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  assignments,
  shifts,
  volunteers,
  users,
  onDataChanged,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [aiFeedbackMap, setAiFeedbackMap] = useState<Record<number, AiFeedback | null>>({});
  const [loadingAiId, setLoadingAiId] = useState<number | null>(null);
  const [forceCheckinId, setForceCheckinId] = useState<number | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [forceProcessingId, setForceProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; text: string; isError?: boolean } | null>(null);

  // POST /api/coordinator/applications/{id}/approve
  const handleApprove = async (assignmentId: number) => {
    setProcessingId(assignmentId);
    const res = await ApiClient.request('POST', `/api/coordinator/applications/${assignmentId}/approve`, {
      feedback: 'Approved based on verified skill alignment and attendance record.',
    });
    setProcessingId(null);
    setFeedback({ id: assignmentId, text: res.status === 200 ? '✓ Approved — ShiftApprovedNotification dispatched.' : res.error || 'Failed', isError: res.status !== 200 });
    if (res.status === 200) onDataChanged();
  };

  // POST /api/coordinator/applications/{id}/reject
  const handleReject = async (assignmentId: number) => {
    setProcessingId(assignmentId);
    const res = await ApiClient.request('POST', `/api/coordinator/applications/${assignmentId}/reject`, {
      feedback: 'Position filled or missing prerequisite skills.',
    });
    setProcessingId(null);
    setFeedback({ id: assignmentId, text: res.status === 200 ? '✓ Application rejected.' : res.error || 'Failed', isError: res.status !== 200 });
    if (res.status === 200) onDataChanged();
  };

  // GET /api/coordinator/applications/{id}/ai-feedback
  const handleGetAiFeedback = async (assignmentId: number) => {
    if (aiFeedbackMap[assignmentId]) {
      // Toggle off
      setAiFeedbackMap((prev) => ({ ...prev, [assignmentId]: null }));
      return;
    }
    setLoadingAiId(assignmentId);
    const res = await ApiClient.request('GET', `/api/coordinator/applications/${assignmentId}/ai-feedback`);
    setLoadingAiId(null);
    if (res.status === 200) {
      setAiFeedbackMap((prev) => ({ ...prev, [assignmentId]: res.data }));
    } else {
      setFeedback({ id: assignmentId, text: res.error || 'AI feedback unavailable', isError: true });
    }
  };

  // POST /api/coordinator/applications/{id}/force-checkin
  const handleForceCheckin = async (assignmentId: number) => {
    if (!forceReason.trim()) {
      setFeedback({ id: assignmentId, text: 'Please enter an override reason first.', isError: true });
      return;
    }
    setForceProcessingId(assignmentId);
    const res = await ApiClient.request('POST', `/api/coordinator/applications/${assignmentId}/force-checkin`, {
      reason: forceReason,
    });
    setForceProcessingId(null);
    setForceCheckinId(null);
    setForceReason('');
    setFeedback({
      id: assignmentId,
      text: res.status === 200
        ? '✓ Force check-in recorded — verification_method: coordinator_force_override.'
        : res.error || 'Force check-in failed',
      isError: res.status !== 200,
    });
    if (res.status === 200) onDataChanged();
  };

  const pendingAssignments = assignments.filter((a) => a.status === 'applied' || a.status === 'pending');
  const pastAssignments = assignments.filter((a) => a.status !== 'applied' && a.status !== 'pending');

  return (
    <div className="space-y-3.5 font-mono">
      {/* Header */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              APPLICATION REVIEW & AI SKILL ALIGNMENT
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {pendingAssignments.length} PENDING
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Endpoints: POST /approve · POST /reject · GET /ai-feedback · POST /force-checkin
          </p>
        </div>
      </div>

      {/* Pending Applications */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          PENDING CANDIDATES ({pendingAssignments.length})
        </span>

        {pendingAssignments.length === 0 ? (
          <div className="bg-[#1e293b] p-6 rounded-lg border border-slate-700 text-center text-slate-400 text-xs">
            No pending candidate applications. All volunteer requests have been processed.
          </div>
        ) : (
          pendingAssignments.map((assignment) => {
            const shift = shifts.find((s) => s.id === assignment.shift_id);
            const volunteer = volunteers.find((v) => v.id === assignment.volunteer_id);
            const user = volunteer ? users.find((u) => u.id === volunteer.user_id) : null;
            const isProcessing = processingId === assignment.id;
            const isLoadingAi = loadingAiId === assignment.id;
            const aiFeedbackData = aiFeedbackMap[assignment.id];
            const isForceCheckin = forceCheckinId === assignment.id;
            const isForceProcessing = forceProcessingId === assignment.id;

            if (!shift || !volunteer || !user) return null;

            return (
              <div key={assignment.id} className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 space-y-2.5 shadow-sm">
                {/* Volunteer Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{user.name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{volunteer.total_hours} HRS LOGGED</span>
                        <span>•</span>
                        <span className="text-cyan-400">{volunteer.attendance_rate}% RELIABILITY</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-300">AI MATCH</div>
                      <div className="text-[9px] text-slate-500">ALIGNMENT</div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                      {assignment.match_score ?? 100}%
                    </div>
                  </div>
                </div>

                {/* Shift & Skills */}
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">APPLYING FOR: <strong className="text-white">{shift.title}</strong></span>
                    <span className="text-slate-400">{shift.start_time.substring(0, 10)}</span>
                  </div>

                  <div className="pt-1 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500 text-[10px]">SKILLS:</span>
                    {volunteer.skills.map((skill, si) => (
                      <span
                        key={si}
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          shift.required_skills.includes(skill)
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Feedback Panel */}
                {aiFeedbackData && (
                  <div className="bg-indigo-950/40 border border-indigo-500/30 rounded p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-indigo-300 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI SCREENING RESULT
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        aiFeedbackData.recommendation === 'STRONG APPROVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {aiFeedbackData.recommendation}
                      </span>
                    </div>
                    {aiFeedbackData.strengths?.length > 0 && (
                      <div className="text-[10px] text-slate-300">
                        <span className="text-emerald-400 font-bold">STRENGTHS: </span>
                        {aiFeedbackData.strengths.join(', ')}
                      </div>
                    )}
                    {aiFeedbackData.gaps?.length > 0 && (
                      <div className="text-[10px] text-slate-300">
                        <span className="text-amber-400 font-bold">GAPS: </span>
                        {aiFeedbackData.gaps.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Force Check-In Panel */}
                {isForceCheckin && (
                  <div className="bg-rose-950/30 border border-rose-500/30 rounded p-2.5 space-y-2">
                    <div className="text-[10px] font-bold text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> FORCE CHECK-IN OVERRIDE
                    </div>
                    <input
                      type="text"
                      value={forceReason}
                      onChange={(e) => setForceReason(e.target.value)}
                      placeholder="Override reason (e.g. Volunteer's phone GPS not working)"
                      className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setForceCheckinId(null); setForceReason(''); }}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={() => handleForceCheckin(assignment.id)}
                        disabled={isForceProcessing}
                        className="flex-1 px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold border border-rose-500/40 flex items-center justify-center gap-1"
                      >
                        {isForceProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                        CONFIRM FORCE CHECK-IN
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Banner */}
                {feedback && feedback.id === assignment.id && (
                  <div className={`p-1.5 rounded text-[10px] font-mono border ${
                    feedback.isError ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}>
                    {feedback.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end flex-wrap gap-2 pt-1">
                  {/* GET /api/coordinator/applications/{id}/ai-feedback */}
                  <button
                    onClick={() => handleGetAiFeedback(assignment.id)}
                    disabled={isLoadingAi}
                    className="px-3 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-xs font-bold border border-indigo-700 transition-all flex items-center gap-1"
                  >
                    {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    <span>AI FEEDBACK</span>
                    {aiFeedbackData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* POST /api/coordinator/applications/{id}/force-checkin */}
                  <button
                    onClick={() => setForceCheckinId(isForceCheckin ? null : assignment.id)}
                    className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800 transition-all flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>FORCE CHECK-IN</span>
                  </button>

                  {/* POST /api/coordinator/applications/{id}/reject */}
                  <button
                    onClick={() => handleReject(assignment.id)}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>DECLINE</span>
                  </button>

                  {/* POST /api/coordinator/applications/{id}/approve */}
                  <button
                    onClick={() => handleApprove(assignment.id)}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400/40 shadow-sm transition-all flex items-center gap-1"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>APPROVE</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* History / Audit Log */}
      {pastAssignments.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            RECENT DECISION AUDIT LOG
          </span>
          <div className="space-y-1.5">
            {pastAssignments.map((a) => {
              const s = shifts.find((shift) => shift.id === a.shift_id);
              const v = volunteers.find((vol) => vol.id === a.volunteer_id);
              const u = v ? users.find((user) => user.id === v.user_id) : null;
              return (
                <div
                  key={a.id}
                  className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        a.status === 'approved' || a.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : a.status === 'rejected' || a.status === 'cancelled'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {a.status}
                    </span>
                    <span className="font-bold text-slate-200">{u?.name}</span>
                    <span className="text-slate-400">• {s?.title}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{a.applied_at?.substring(0, 10)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
