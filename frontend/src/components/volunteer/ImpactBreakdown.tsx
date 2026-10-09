import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Star, Award, RefreshCw, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import { User, Volunteer } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface ImpactBreakdownProps {
  currentUser: User | null;
  volunteer: Volunteer;
  theme: 'dark' | 'light';
}

interface ImpactData {
  total_hours: number;
  impact_score: number;
  attendance_rate: number;
  breakdown: {
    base_hours_score: number;
    skill_multiplier: number;
    attendance_bonus: number;
    on_time_bonus: number;
  };
  milestones: { hours: number; achieved: boolean; certificate_number?: string }[];
  recent_activities: { shift_title: string; date: string; hours: number; impact_earned: number }[];
}

export const ImpactBreakdown: React.FC<ImpactBreakdownProps> = ({ currentUser, volunteer, theme }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.request('GET', '/volunteer/impact', undefined, currentUser);
      if (res.status === 200) {
        setData(res.data?.impact || res.data);
      } else {
        setError(res.error || 'Failed to load impact breakdown.');
      }
    } catch {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const MILESTONES = [10, 25, 50, 100];
  const currentHours = data?.total_hours ?? volunteer.total_hours;
  const currentScore = data?.impact_score ?? volunteer.impact_score;
  const currentRate = data?.attendance_rate ?? volunteer.attendance_rate;

  const nextMilestone = MILESTONES.find((m) => m > currentHours);
  const progressToNext = nextMilestone ? ((currentHours / nextMilestone) * 100).toFixed(1) : 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-lg border p-4 flex items-start justify-between ${cardBg}`}>
        <div>
          <h1 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Impact Score Breakdown
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Detailed breakdown of your volunteer impact score, hours, and milestone progress.
          </p>
          <p className="text-[10px] font-mono text-indigo-400 mt-1">API: GET /api/volunteer/impact</p>
        </div>
        <button onClick={load}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-600'}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Hours', value: `${currentHours}h`, icon: Clock, color: 'indigo', sub: 'Verified service hours' },
              { label: 'Impact Score', value: `${currentScore}`, icon: Star, color: 'amber', sub: 'Composite score (0–100)' },
              { label: 'Attendance Rate', value: `${currentRate}%`, icon: TrendingUp, color: 'emerald', sub: 'On-time completion rate' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border p-3 ${cardBg}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.label}</div>
                <div className={`text-2xl font-bold font-mono mb-0.5 ${
                  s.color === 'amber' ? 'text-amber-400' : s.color === 'emerald' ? 'text-emerald-400' : 'text-indigo-400'
                }`}>{s.value}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Score Breakdown */}
          {data?.breakdown && (
            <div className={`rounded-lg border p-4 ${cardBg}`}>
              <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Score Components
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Base Hours Score', value: data.breakdown.base_hours_score, color: 'bg-indigo-500' },
                  { label: 'Skill Multiplier Bonus', value: data.breakdown.skill_multiplier, color: 'bg-purple-500' },
                  { label: 'Attendance Bonus', value: data.breakdown.attendance_bonus, color: 'bg-emerald-500' },
                  { label: 'On-Time Bonus', value: data.breakdown.on_time_bonus, color: 'bg-amber-500' },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className={`text-[10px] w-36 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{b.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${Math.min(100, b.value)}%` }} />
                    </div>
                    <div className={`text-[10px] font-bold w-8 text-right font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestone Progress */}
          <div className={`rounded-lg border p-4 ${cardBg}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Milestone Progress — Auto Certificate Generation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MILESTONES.map((m) => {
                const achieved = currentHours >= m;
                return (
                  <div key={m} className={`rounded-lg border p-3 text-center ${
                    achieved
                      ? isDark ? 'border-emerald-700/40 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50'
                      : isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <Award className={`w-5 h-5 mx-auto mb-1 ${achieved ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <div className={`text-xl font-bold font-mono ${achieved ? 'text-emerald-400' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>{m}h</div>
                    <div className={`text-[9px] font-bold uppercase mt-0.5 ${achieved ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {achieved ? '✓ Achieved' : `${(m - currentHours).toFixed(1)}h to go`}
                    </div>
                  </div>
                );
              })}
            </div>
            {nextMilestone && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Progress to {nextMilestone}h milestone</span>
                  <span className="font-bold text-indigo-400">{progressToNext}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressToNext}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Recent Activities */}
          {data?.recent_activities && data.recent_activities.length > 0 && (
            <div className={`rounded-lg border ${cardBg}`}>
              <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Recent Activities</h2>
              </div>
              <div className="divide-y divide-slate-800">
                {data.recent_activities.map((a, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{a.shift_title}</div>
                      <div className="text-[10px] text-slate-500">{new Date(a.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>+{a.hours}h</span>
                      <span className="text-amber-400 font-bold">+{a.impact_earned} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
