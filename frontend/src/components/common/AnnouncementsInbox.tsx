import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Bell, BellRing, Send, X } from 'lucide-react';
import { Announcement, User } from '../../types/vms';
import { ApiClient } from '../../services/apiClient';

interface AnnouncementsInboxProps {
  currentUser: User | null;
  theme: 'dark' | 'light';
}

export const AnnouncementsInbox: React.FC<AnnouncementsInboxProps> = ({ currentUser, theme }) => {
  const isDark = theme === 'dark';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.request('GET', '/announcements', undefined, currentUser);
      if (res.status === 200) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAnnouncements(data);
      } else {
        setError(res.error || 'Failed to load announcements.');
      }
    } catch {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 flex items-start justify-between ${cardBg}`}>
        <div>
          <h1 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Announcements Inbox
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Platform-wide broadcasts and urgent shift alerts for all authenticated users.
          </p>
          <p className="text-[10px] font-mono text-indigo-400 mt-1">API: GET /api/announcements</p>
        </div>
        <button onClick={load} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-600'}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : announcements.length === 0 ? (
        <div className={`rounded-lg border p-12 text-center ${cardBg}`}>
          <Bell className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No announcements yet.</p>
          <p className="text-xs text-slate-600 mt-1">Urgent shift broadcasts and organization messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`rounded-lg border p-4 ${cardBg} ${a.is_urgent ? (isDark ? 'border-red-700/50' : 'border-red-300') : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.is_urgent ? 'bg-red-500/20 text-red-400' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {a.is_urgent ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {a.is_urgent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase">URGENT</span>}
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{a.title}</span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{a.content || a.message}</p>
                  <div className={`flex items-center gap-3 mt-2 text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span>From: {a.author_name || 'System'}</span>
                    {a.created_at && <span>{new Date(a.created_at).toLocaleString()}</span>}
                    {a.target_audience && <span className="font-mono">→ {a.target_audience}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Announcements Manager (Coordinator) ─────────────────────────────────────
interface AnnouncementsManagerProps {
  currentUser: User | null;
  theme: 'dark' | 'light';
}

export const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({ currentUser, theme }) => {
  const isDark = theme === 'dark';
  const [form, setForm] = useState({ title: '', content: '', target_audience: 'volunteers', is_urgent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<Announcement[]>([]);

  const inputCls = `w-full px-3 py-2 rounded text-sm border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`;
  const labelCls = `block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`;
  const cardBg = isDark ? 'bg-[#162235] border-slate-800' : 'bg-white border-slate-200';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await ApiClient.request('POST', '/coordinator/announcements', form, currentUser);
      if (res.status === 201 || res.status === 200) {
        setSuccess('Announcement published successfully!');
        setHistory((prev) => [res.data?.announcement || res.data || { ...form, id: Date.now(), created_at: new Date().toISOString(), author_name: currentUser?.name }, ...prev]);
        setForm({ title: '', content: '', target_audience: 'volunteers', is_urgent: false });
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error || 'Failed to publish announcement.');
      }
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${cardBg}`}>
        <h1 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Create Announcement</h1>
        <p className="text-[10px] font-mono text-indigo-400 mt-0.5">POST /api/coordinator/announcements</p>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

      <form onSubmit={handleSend} className={`rounded-lg border p-4 space-y-3 ${cardBg}`}>
        <div>
          <label className={labelCls}>Announcement Title *</label>
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Important: Volunteer Training This Saturday" />
        </div>
        <div>
          <label className={labelCls}>Message Content *</label>
          <textarea required rows={4} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Write the announcement details here…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Target Audience</label>
            <select value={form.target_audience} onChange={(e) => setForm((p) => ({ ...p, target_audience: e.target.value }))} className={inputCls}>
              <option value="volunteers">Volunteers</option>
              <option value="coordinators">Coordinators</option>
              <option value="all">All Members</option>
            </select>
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_urgent} onChange={(e) => setForm((p) => ({ ...p, is_urgent: e.target.checked }))}
                className="w-4 h-4 rounded accent-red-500" />
              <span className={`text-xs font-bold ${form.is_urgent ? 'text-red-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Mark as URGENT
              </span>
            </label>
          </div>
        </div>
        <button type="submit" disabled={sending}
          className="w-full py-2.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? 'Publishing…' : 'Publish Announcement'}
        </button>
      </form>

      {/* Announcement history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Published This Session</h2>
          {history.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                {a.is_urgent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase">URGENT</span>}
                <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{a.title}</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{a.content || a.message}</p>
              <div className="text-[10px] text-slate-600 mt-1">→ {a.target_audience || 'volunteers'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
