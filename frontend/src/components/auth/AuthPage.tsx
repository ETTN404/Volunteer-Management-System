import React, { useState } from 'react';
import { ShieldCheck, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { ApiClient } from '../../services/apiClient';

interface AuthPageProps {
  onAuthenticated: (token: string, user: any) => void;
  theme: 'dark' | 'light';
}

const ALL_SKILLS = [
  'First Aid', 'Teaching', 'Logistics', 'IT Support', 'Medical', 'Driving',
  'Cooking', 'Counseling', 'Construction', 'Translation', 'Photography', 'Admin',
];

const ALL_AVAILABILITY = ['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Full-time'];

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, theme }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regSkills, setRegSkills] = useState<string[]>([]);
  const [regAvailability, setRegAvailability] = useState<string[]>([]);

  const isDark = theme === 'dark';

  const toggleSkill = (s: string) =>
    setRegSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleAvail = (a: string) =>
    setRegAvailability((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await ApiClient.request('POST', '/login', {
        email: loginEmail,
        password: loginPassword,
      });
      if (res.status === 200 || res.status === 201) {
        const token = res.data?.access_token || res.data?.token || (res as any).access_token;
        const user = res.data?.user || res.data;
        setSuccess('Login successful! Redirecting…');
        setTimeout(() => onAuthenticated(token, user), 600);
      } else {
        setError(res.error || res.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Cannot connect to backend. Ensure Laravel is running on http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regSkills.length === 0) { setError('Please select at least one skill.'); return; }
    setLoading(true);
    try {
      const res = await ApiClient.request('POST', '/register', {
        full_name: regName,
        name: regName,
        email: regEmail,
        password: regPassword,
        password_confirmation: regPassword,
        bio: regBio,
        skills: regSkills,
        availability: regAvailability,
      });
      if (res.status === 200 || res.status === 201) {
        const token = res.data?.access_token || res.data?.token || (res as any).access_token;
        const user = res.data?.user || res.data;
        setSuccess('Account created! Redirecting…');
        setTimeout(() => onAuthenticated(token, user), 600);
      } else {
        setError(res.error || res.message || 'Registration failed. Check the form and try again.');
      }
    } catch {
      setError('Cannot connect to backend. Ensure Laravel is running on http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 rounded text-sm border outline-none transition-colors ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
  }`;

  const labelCls = `block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-100'}`}>
      <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#131d2e] border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">VOLUNTRACK VMS</div>
              <div className="text-indigo-200 text-xs">Volunteer Management System</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t
                  ? 'border-b-2 border-indigo-500 text-indigo-500'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {t === 'login' ? 'Sign In' : 'Register as Volunteer'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Error/Success Banners */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@redcross.org"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputCls} pl-9 pr-9`}
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick-fill hints */}
              <div className={`rounded p-3 text-[10px] space-y-1 ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-emerald-400 font-bold">🟢 Live MySQL Seeded Credentials:</span>
                  <span className="text-[9px] font-mono text-indigo-400">PORT 8000</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {[
                    { role: 'SuperAdmin', email: 'superadmin@vms.com', pass: 'password' },
                    { role: 'OrgAdmin', email: 'redcross.admin@vms.com', pass: 'password' },
                    { role: 'Coordinator', email: 'redcross.coord@vms.com', pass: 'password' },
                    { role: 'Volunteer', email: 'redcross.vol@vms.com', pass: 'password' },
                  ].map((c) => (
                    <button
                      key={c.role}
                      type="button"
                      onClick={() => { setLoginEmail(c.email); setLoginPassword(c.pass); }}
                      className={`text-left px-2 py-1 rounded border text-[10px] transition-colors ${
                        isDark ? 'border-slate-700 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      <span className="font-bold">{c.role}:</span> {c.email}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                      placeholder="Sara Jenkins" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="sara@example.com" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} required value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 characters" className={`${inputCls} pl-9 pr-9`} />
                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Bio / Short Introduction</label>
                <textarea rows={2} value={regBio} onChange={(e) => setRegBio(e.target.value)}
                  placeholder="Experienced first aid provider and community volunteer."
                  className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Skills <span className="text-indigo-400">(select at least 1)</span></label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_SKILLS.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSkill(s)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                        regSkills.includes(s)
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : isDark ? 'border-slate-700 text-slate-400 hover:border-indigo-500' : 'border-slate-300 text-slate-600 hover:border-indigo-400'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Availability</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_AVAILABILITY.map((a) => (
                    <button key={a} type="button" onClick={() => toggleAvail(a)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                        regAvailability.includes(a)
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : isDark ? 'border-slate-700 text-slate-400 hover:border-emerald-500' : 'border-slate-300 text-slate-600 hover:border-emerald-400'
                      }`}
                    >{a}</button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Creating account…' : 'Create Volunteer Account'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t text-center text-[10px] font-mono ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
          API: POST /api/login · POST /api/register · Laravel Sanctum Bearer Token Auth
        </div>
      </div>
    </div>
  );
};
