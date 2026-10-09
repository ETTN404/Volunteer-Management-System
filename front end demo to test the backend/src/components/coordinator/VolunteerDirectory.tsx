import React, { useState, useEffect } from 'react';
import { Users, Eye, Star, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { User, Volunteer } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface VolunteerDirectoryProps {
  currentUser: User | null;
  theme: 'dark' | 'light';
}

export const VolunteerDirectory: React.FC<VolunteerDirectoryProps> = ({ currentUser, theme }) => {
  const isDark = theme === 'dark';
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);

  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.request('GET', '/coordinator/volunteers', undefined, currentUser);
      if (res.status === 200) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setVolunteers(data);
      } else {
        setError(res.error || 'Failed to load volunteer directory.');
      }
    } catch {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (volunteerId: number) => {
    if (selectedVolunteer?.id === volunteerId) { setSelectedVolunteer(null); return; }
    setLoadingDetail(volunteerId);
    try {
      const res = await ApiClient.request('GET', `/coordinator/volunteers/${volunteerId}`, undefined, currentUser);
      if (res.status === 200) {
        setSelectedVolunteer(res.data?.volunteer || res.data);
      }
    } finally {
      setLoadingDetail(null);
    }
  };

  useEffect(() => { load(); }, []);

  const skillBadge = (s: string) => (
    <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{s}</span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-lg border p-4 flex items-start justify-between ${cardBg}`}>
        <div>
          <h1 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Volunteer Directory
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Browse and inspect all volunteers registered in this tenant.
          </p>
          <p className="text-[10px] font-mono text-indigo-400 mt-1">
            API: GET /api/coordinator/volunteers · GET /api/coordinator/volunteers/{'{id}'}
          </p>
        </div>
        <button onClick={load}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-600'}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {volunteers.length === 0 ? (
            <div className={`col-span-2 rounded-lg border p-12 text-center ${cardBg}`}>
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No volunteers found.</p>
            </div>
          ) : volunteers.map((v) => {
            const volData = v.volunteer || v;
            const userData = v.user || v;
            const isSelected = selectedVolunteer?.id === (volData.id || v.id);
            return (
              <div key={v.id || volData.id} className={`rounded-lg border ${cardBg} overflow-hidden`}>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {userData.name || v.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{userData.email || v.email}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                        {volData.total_hours || 0}h
                      </div>
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <div className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {volData.impact_score || 0}pts
                      </div>
                    </div>
                  </div>
                  {volData.skills && volData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(volData.skills as string[]).slice(0, 4).map(skillBadge)}
                      {volData.skills.length > 4 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>+{volData.skills.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`border-t px-3 py-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={() => loadDetail(volData.id || v.id)}
                    disabled={loadingDetail === (volData.id || v.id)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : isDark ? 'border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-600' : 'border-slate-200 text-slate-500 hover:text-indigo-600'
                    }`}
                  >
                    {loadingDetail === (volData.id || v.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    {isSelected ? 'Hide Profile' : 'View Full Profile'}
                  </button>
                </div>

                {/* Expanded Profile Detail */}
                {isSelected && selectedVolunteer && (
                  <div className={`border-t p-3 text-[11px] space-y-1 ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <div className="text-[9px] font-mono text-indigo-400 mb-2">
                      GET /api/coordinator/volunteers/{selectedVolunteer.id}
                    </div>
                    <div><span className="font-bold">Skills:</span> {(selectedVolunteer.skills || []).join(', ') || 'N/A'}</div>
                    <div><span className="font-bold">Total Hours:</span> {selectedVolunteer.total_hours}h</div>
                    <div><span className="font-bold">Impact Score:</span> {selectedVolunteer.impact_score} pts</div>
                    <div><span className="font-bold">Attendance Rate:</span> {selectedVolunteer.attendance_rate}%</div>
                    <div><span className="font-bold">Availability:</span> {(selectedVolunteer.availability || []).join(', ') || 'N/A'}</div>
                    <div><span className="font-bold">Bio:</span> {selectedVolunteer.bio || 'N/A'}</div>
                    <div><span className="font-bold">Emergency Contact:</span> {selectedVolunteer.emergency_contact || 'N/A'}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
