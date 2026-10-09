import React, { useState, useEffect } from 'react';
import { VmsStore } from './services/vmsStore';
import { ApiClient } from './services/apiClient';
import { Sidebar } from './components/navigation/Sidebar';
import { TopHeader } from './components/navigation/TopHeader';
import { ApiTestConsole } from './components/tester/ApiTestConsole';

// Auth
import { AuthPage } from './components/auth/AuthPage';

// Volunteer Views & Modals
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { BrowseEvents } from './components/volunteer/BrowseEvents';
import { ScheduleAndAttendance } from './components/volunteer/ScheduleAndAttendance';
import { CertificatesHub } from './components/volunteer/CertificatesHub';
import { VolunteerProfile } from './components/volunteer/VolunteerProfile';
import { VolunBotChat } from './components/volunteer/VolunBotChat';
import { CheckInModal } from './components/volunteer/CheckInModal';
import { CheckOutModal } from './components/volunteer/CheckOutModal';
import { ImpactBreakdown } from './components/volunteer/ImpactBreakdown';

// Coordinator Views & Modals
import { CoordinatorDashboard } from './components/coordinator/CoordinatorDashboard';
import { EventManagement } from './components/coordinator/EventManagement';
import { LiveShiftAttendance } from './components/coordinator/LiveShiftAttendance';
import { ApplicationReview } from './components/coordinator/ApplicationReview';
import { ReportsCenter } from './components/coordinator/ReportsCenter';
import { UrgentBroadcastModal } from './components/coordinator/UrgentBroadcastModal';
import { VolunteerDirectory } from './components/coordinator/VolunteerDirectory';
import { AnnouncementsManager } from './components/common/AnnouncementsInbox';

// SuperAdmin Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { AuditLogsViewer } from './components/admin/AuditLogsViewer';

// OrgAdmin Portal
import { OrgAdminDashboard } from './components/orgadmin/OrgAdminDashboard';

// Common
import { PublicVerifyModal } from './components/common/PublicVerifyModal';
import { AnnouncementsInbox } from './components/common/AnnouncementsInbox';
import { Shift, Event, Attendance, User } from './types/vms';
import { Bot, CheckCircle2, LogOut } from 'lucide-react';

type AppRole = 'superadmin' | 'orgadmin' | 'coordinator' | 'volunteer';

export function App() {
  const [dataVersion, setDataVersion] = useState(0);
  const [currentRole, setCurrentRole] = useState<AppRole>('volunteer');
  const [currentTenantId, setCurrentTenantId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('voluntrack_sanctum_token'));
  const [authUser, setAuthUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('voluntrack_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Navigation sidebar & layout state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('vms_sidebar_collapsed');
    return saved === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dark & Light Mode state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('vms_theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  // Modals state
  const [isTestConsoleOpen, setIsTestConsoleOpen] = useState(false);
  const [isPublicVerifyOpen, setIsPublicVerifyOpen] = useState(false);
  const [verifyCertNumber, setVerifyCertNumber] = useState('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active check-in / checkout target
  const [checkInTarget, setCheckInTarget] = useState<{ shift: Shift; event: Event } | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<{ shift: Shift; attendance?: Attendance } | null>(null);

  const reloadData = () => setDataVersion((v) => v + 1);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('vms_theme', next);
      return next;
    });
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('vms_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch live authenticated user profile from GET /api/user on mount
  useEffect(() => {
    if (authToken) {
      ApiClient.request('GET', '/user')
        .then((res) => {
          if (res.status === 200 && res.data) {
            const user = res.data.user || res.data;
            setAuthUser(user);
            localStorage.setItem('voluntrack_user', JSON.stringify(user));
            const role = (user.role || '').toLowerCase();
            if (role.includes('superadmin')) setCurrentRole('superadmin');
            else if (role.includes('orgadmin')) setCurrentRole('orgadmin');
            else if (role.includes('coord')) setCurrentRole('coordinator');
            else setCurrentRole('volunteer');
          } else if (res.status === 401) {
            localStorage.removeItem('voluntrack_sanctum_token');
            localStorage.removeItem('voluntrack_user');
            setAuthToken(null);
            setAuthUser(null);
          }
        })
        .catch(() => {});
    }
  }, [authToken]);

  // On auth token change, set role based on user role from auth response
  const handleAuthenticated = (token: string, user: any) => {
    setAuthToken(token);
    setAuthUser(user);
    if (user) {
      localStorage.setItem('voluntrack_user', JSON.stringify(user));
    }
    // Auto-set role based on user's actual role
    const role = (user?.role || '').toLowerCase();
    if (role.includes('superadmin')) setCurrentRole('superadmin');
    else if (role.includes('orgadmin')) setCurrentRole('orgadmin');
    else if (role.includes('coord')) setCurrentRole('coordinator');
    else setCurrentRole('volunteer');
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await ApiClient.request('POST', '/logout', undefined, authUser);
    localStorage.removeItem('voluntrack_sanctum_token');
    localStorage.removeItem('voluntrack_user');
    setAuthToken(null);
    setAuthUser(null);
    setCurrentRole('volunteer');
    setActiveTab('dashboard');
    showToast('Logged out successfully.');
  };

  // Fetch current state from store
  const db = VmsStore.get();
  const orgList = db.organizations || [];
  const userList = db.users || [];
  const volunteerList = db.volunteers || [];
  const eventList = db.events || [];
  const shiftList = db.shifts || [];
  const assignmentList = db.shiftAssignments || [];
  const certificateList = db.certificates || [];
  const attendanceList = db.attendances || [];

  const currentOrg = orgList.find((o) => o.id === currentTenantId) || orgList[0] || {
    id: 1, name: 'Hope Food Relief Network', slug: 'hope-food-relief',
    subscription_plan: 'enterprise', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  // Derive current user from authUser or mock store
  const isRoleMatch = (userRole: string, targetRole: AppRole) => {
    const r = (userRole || '').toLowerCase();
    if (targetRole === 'superadmin') return r.includes('superadmin');
    if (targetRole === 'orgadmin') return r.includes('orgadmin') || r === 'admin';
    if (targetRole === 'coordinator') return r.includes('coord');
    if (targetRole === 'volunteer') return r.includes('volun');
    return false;
  };

  const normalizeUser = (u: any): User | null => {
    if (!u) return null;
    return {
      ...u,
      name: u.full_name || u.name || u.email || 'Authenticated User',
      role: u.role || 'Volunteer',
    };
  };

  const currentUser: User = normalizeUser(authUser) ||
    userList.find((u) => isRoleMatch(u.role as string, currentRole) && (u.organization_id === currentTenantId || u.org_id === currentTenantId)) ||
    userList.find((u) => isRoleMatch(u.role as string, currentRole)) ||
    userList[0] || {
      id: 1, name: 'System Administrator', email: 'admin@voluntrack.org',
      role: 'SuperAdmin' as any, is_active: true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

  const currentVolunteer = (currentUser ? volunteerList.find((v) => v.user_id === currentUser.id) : null) ||
    volunteerList[0] || {
      id: 1, user_id: currentUser?.id || 1,
      skills: ['Logistics', 'First Aid'],
      total_hours: 45, impact_score: 82, attendance_rate: 98,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

  const tenantEvents = eventList.filter((e) => e.organization_id === currentTenantId || e.org_id === currentTenantId);
  const eventIds = tenantEvents.map((e) => e.id);
  const tenantShifts = shiftList.filter((s) => eventIds.includes(s.event_id));
  const myAssignments = assignmentList.filter((a) => a.volunteer_id === currentVolunteer.id);
  const myCertificates = certificateList.filter((c) => c.volunteer_id === currentVolunteer.id);
  const myAttendances = attendanceList.filter((a) => a.volunteer_id === currentVolunteer.id);

  const handleRoleChange = (newRole: AppRole) => {
    setCurrentRole(newRole);
    setActiveTab('dashboard');
  };

  const handleTenantChange = (orgId: number) => {
    setCurrentTenantId(orgId);
    reloadData();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isDark = theme === 'dark';

  // ─── AUTH GATE ─────────────────────────────────────────────────────────────
  if (!authToken) {
    return <AuthPage theme={theme} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div
      className={`min-h-screen flex font-sans antialiased transition-colors ${
        isDark
          ? 'bg-[#0f172a] text-slate-200 selection:bg-indigo-600 selection:text-white'
          : 'bg-slate-100 text-slate-800 selection:bg-indigo-500 selection:text-white light-theme'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-5 z-50 bg-indigo-600 text-white font-mono font-bold text-xs px-3.5 py-2.5 rounded border border-indigo-400/50 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Collapsible / Expandable Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        organizations={db.organizations}
        currentTenantId={currentTenantId}
        onTenantChange={handleTenantChange}
        onOpenTester={() => setIsTestConsoleOpen(true)}
        onOpenPublicVerify={() => {
          setVerifyCertNumber('CERT-2026-0050');
          setIsPublicVerifyOpen(true);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Layout Wrapper with Sidebar Offset */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <TopHeader
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          activeTab={activeTab}
          currentRole={currentRole}
          currentOrg={currentOrg}
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenTester={() => setIsTestConsoleOpen(true)}
          onOpenPublicVerify={() => {
            setVerifyCertNumber('CERT-2026-0050');
            setIsPublicVerifyOpen(true);
          }}
        />

        {/* Clean User Bar */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-2 border-b text-xs transition-colors ${isDark ? 'bg-[#0f172a] border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-600 shadow-xs'}`}>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Signed in as</span>
            <span className="font-semibold text-slate-100">{currentUser.name || (currentUser as any).full_name || 'User'}</span>
            <span className="text-slate-500">({currentUser.email})</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium ml-1">
              {currentUser.role}
            </span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 font-medium transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-500/10">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Main Routed Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 space-y-4">

          {/* ================= VOLUNTEER ROLE ================= */}
          {currentRole === 'volunteer' && (
            <>
              {activeTab === 'dashboard' && (
                <VolunteerDashboard
                  volunteer={currentVolunteer}
                  user={currentUser}
                  org={currentOrg}
                  upcomingShifts={tenantShifts}
                  events={tenantEvents}
                  certificates={myCertificates}
                  onNavigateTab={setActiveTab}
                  onOpenCheckIn={(shift, event) => setCheckInTarget({ shift, event })}
                />
              )}
              {activeTab === 'browse' && (
                <BrowseEvents
                  events={tenantEvents}
                  volunteer={currentVolunteer}
                  myAssignments={myAssignments}
                  onApplicationSuccess={(_assignment) => {
                    showToast('Shift application submitted! Coordinator notified.');
                    reloadData();
                  }}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleAndAttendance
                  assignments={myAssignments}
                  shifts={tenantShifts}
                  events={tenantEvents}
                  attendances={myAttendances}
                  onOpenCheckIn={(shift, event) => setCheckInTarget({ shift, event })}
                  onOpenCheckOut={(shift, attendance) => setCheckOutTarget({ shift, attendance })}
                />
              )}
              {activeTab === 'impact' && (
                <ImpactBreakdown
                  volunteer={currentVolunteer}
                  currentUser={currentUser}
                  theme={theme}
                />
              )}
              {activeTab === 'certificates' && (
                <CertificatesHub
                  certificates={myCertificates}
                  volunteer={currentVolunteer}
                  user={currentUser}
                  org={currentOrg}
                  onVerifyPublicly={(certNum) => {
                    setVerifyCertNumber(certNum);
                    setIsPublicVerifyOpen(true);
                  }}
                />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsInbox currentUser={currentUser} theme={theme} />
              )}
              {activeTab === 'profile' && (
                <VolunteerProfile
                  volunteer={currentVolunteer}
                  user={currentUser}
                  onSaveSuccess={(_updated) => {
                    showToast('Profile and skills updated successfully!');
                    reloadData();
                  }}
                />
              )}
              {activeTab === 'chat' && (
                <div className="max-w-3xl mx-auto">
                  <VolunBotChat
                    volunteer={currentVolunteer}
                    user={currentUser}
                    org={currentOrg}
                    upcomingShifts={tenantShifts}
                    isInline={true}
                  />
                </div>
              )}
            </>
          )}

          {/* ================= COORDINATOR ROLE ================= */}
          {currentRole === 'coordinator' && (
            <>
              {activeTab === 'dashboard' && (
                <CoordinatorDashboard
                  events={tenantEvents}
                  shifts={tenantShifts}
                  assignments={db.shiftAssignments}
                  attendances={db.attendances}
                  org={currentOrg}
                  onNavigateTab={setActiveTab}
                  onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
                />
              )}
              {activeTab === 'events' && (
                <EventManagement
                  events={tenantEvents}
                  shifts={tenantShifts}
                  org={currentOrg}
                  onDataChanged={reloadData}
                />
              )}
              {activeTab === 'live_shift' && (
                <LiveShiftAttendance
                  shifts={tenantShifts}
                  events={tenantEvents}
                  assignments={db.shiftAssignments}
                  attendances={db.attendances}
                  volunteers={db.volunteers}
                  users={db.users}
                  onDataChanged={reloadData}
                />
              )}
              {activeTab === 'applications' && (
                <ApplicationReview
                  assignments={db.shiftAssignments}
                  shifts={tenantShifts}
                  volunteers={db.volunteers}
                  users={db.users}
                  onDataChanged={reloadData}
                />
              )}
              {activeTab === 'vol_directory' && (
                <VolunteerDirectory currentUser={currentUser} theme={theme} />
              )}
              {activeTab === 'announcements_mgr' && (
                <AnnouncementsManager currentUser={currentUser} theme={theme} />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsInbox currentUser={currentUser} theme={theme} />
              )}
              {activeTab === 'reports' && <ReportsCenter />}
            </>
          )}

          {/* ================= SUPERADMIN ROLE ================= */}
          {currentRole === 'superadmin' && (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  organizations={db.organizations}
                  users={db.users}
                  events={db.events}
                  attendances={db.attendances}
                  auditLogs={db.auditLogs}
                  onNavigateTab={setActiveTab}
                  onDataChanged={reloadData}
                  currentUser={currentUser}
                  theme={theme}
                />
              )}
              {activeTab === 'users' && (
                <UserManagement
                  users={db.users}
                  organizations={db.organizations}
                  onDataChanged={reloadData}
                />
              )}
              {activeTab === 'audits' && <AuditLogsViewer logs={db.auditLogs} />}
              {activeTab === 'announcements' && (
                <AnnouncementsInbox currentUser={currentUser} theme={theme} />
              )}
            </>
          )}

          {/* ================= ORGADMIN ROLE ================= */}
          {currentRole === 'orgadmin' && (
            <>
              {activeTab === 'dashboard' && (
                <OrgAdminDashboard currentUser={currentUser} theme={theme} onDataChanged={reloadData} />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsInbox currentUser={currentUser} theme={theme} />
              )}
              {activeTab === 'audits' && <AuditLogsViewer logs={db.auditLogs} />}
            </>
          )}
        </main>

        {/* Clean Executive Footer */}
        <footer
          className={`py-3 border-t flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 shrink-0 text-xs transition-colors ${
            isDark
              ? 'bg-[#0f172a] border-slate-800/80 text-slate-500'
              : 'bg-white border-slate-200 text-slate-500 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Volunteer Management System</span>
            <span>• Enterprise Edition</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px] mt-1 sm:mt-0">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Operational
            </span>
            <span>•</span>
            <span>Secured with SSL / TLS</span>
          </div>
        </footer>
      </div>

      {/* Floating VolunBot Widget (bottom right for volunteer role) */}
      {currentRole === 'volunteer' && activeTab !== 'chat' && (
        <>
          <button
            onClick={() => setIsFloatingChatOpen(!isFloatingChatOpen)}
            className="fixed bottom-12 right-6 z-40 p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
          >
            <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold pr-1">Ask VolunBot</span>
          </button>

          <VolunBotChat
            volunteer={currentVolunteer}
            user={currentUser}
            org={currentOrg}
            upcomingShifts={tenantShifts}
            isOpen={isFloatingChatOpen}
            onClose={() => setIsFloatingChatOpen(false)}
            isInline={false}
          />
        </>
      )}

      {/* Check-In Modal */}
      {checkInTarget && (
        <CheckInModal
          shift={checkInTarget.shift}
          event={checkInTarget.event}
          isOpen={true}
          onClose={() => setCheckInTarget(null)}
          onSuccess={(msg) => {
            showToast(msg);
            reloadData();
          }}
        />
      )}

      {/* Check-Out Modal */}
      {checkOutTarget && (
        <CheckOutModal
          shift={checkOutTarget.shift}
          attendance={checkOutTarget.attendance}
          isOpen={true}
          onClose={() => setCheckOutTarget(null)}
          onSuccess={(data) => {
            showToast(`Logged ${data.hours_worked} hours! Impact +${data.impact_earned} pts.`);
            reloadData();
          }}
        />
      )}

      {/* Emergency Broadcast Modal */}
      <UrgentBroadcastModal
        shifts={tenantShifts}
        events={tenantEvents}
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          reloadData();
        }}
      />

      {/* Public Certificate Verification Modal */}
      <PublicVerifyModal
        initialCertNumber={verifyCertNumber}
        isOpen={isPublicVerifyOpen}
        onClose={() => setIsPublicVerifyOpen(false)}
      />

      {/* Master API Test Console Drawer/Modal */}
      <ApiTestConsole
        isOpen={isTestConsoleOpen}
        onClose={() => setIsTestConsoleOpen(false)}
        onDataChanged={reloadData}
      />
    </div>
  );
}

export default App;
