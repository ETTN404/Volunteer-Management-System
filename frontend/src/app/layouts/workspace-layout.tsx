import { AnimatePresence, motion } from 'motion/react';
import { Bell, LogOut, Menu as MenuIcon, Search, UserCircle2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Kbd, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet, SheetContent } from '@/shared/ui';
import { useSession } from '@/features/auth/use-session';
import { useLogout, useMe } from '@/features/auth/api';
import { ROLE_LABEL } from '@/features/auth/session-store';
import { useNotifications } from '@/features/notifications/api';
import { useOpsDashboard, usePendingHours } from '@/features/operations/api';
import { useDocumentQueue } from '@/features/documents/api';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { useUiStore } from '../ui-store';
import { NAV } from '../navigation';
import { Sidebar, type NavBadges } from './sidebar';
import { CommandPalette } from './command-palette';
import { NotificationsPanel } from './notifications-panel';
import { ThemeToggle } from './theme-toggle';
import { ColdStartBanner } from './cold-start-banner';
import { ActiveShiftBanner } from '@/features/volunteer/components/active-shift-banner';
import { applyBrand } from '@/shared/lib/color';
import { useResolvedTheme } from '../providers/theme';

function useCoordinatorBadges(enabled: boolean): NavBadges {
  const dash = useOpsDashboard();
  const docs = useDocumentQueue('pending');
  const hours = usePendingHours();
  if (!enabled) return {};
  return {
    applications: dash.data?.pending_applications,
    documents: docs.data?.length,
    hours: hours.data?.length,
  };
}

function CoordinatorBadges({ children }: { children: (b: NavBadges) => ReactNode }) {
  return <>{children(useCoordinatorBadges(true))}</>;
}

export function WorkspaceLayout({ slot }: { slot?: ReactNode }) {
  const { user, role } = useSession();
  const org = useMe().data?.organization ?? user?.organization;
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = useNotifications();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  // Captured per render so the exiting page keeps its own content during the transition.
  const outlet = useOutlet();

  const theme = useResolvedTheme();
  // Tenant branding (G20): the organization's color becomes the workspace accent.
  useEffect(() => {
    applyBrand(org?.primary_color, theme);
    return () => applyBrand(null, theme);
  }, [org?.primary_color, theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  if (!user || !role) return null;
  const isVolunteer = role === 'Volunteer';
  const unread = notifications.data?.unread ?? 0;

  const sidebar = (badges: NavBadges) => (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-[var(--ease-out-expo)] lg:block',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <Sidebar role={role} user={user} org={org} collapsed={collapsed} onToggle={toggle} badges={badges} />
    </aside>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only z-[70] rounded-md bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>

      {role === 'Coordinator' ? <CoordinatorBadges>{(b) => sidebar(b)}</CoordinatorBadges> : sidebar({})}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent title="Menu" side="left" width="sm" className="!p-0 lg:hidden">
          <div className="-mx-6 -my-5 h-[calc(100dvh-81px)]">
            <Sidebar role={role} user={user} org={org} collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-300 ease-[var(--ease-out-expo)]', collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]')}>
        <ColdStartBanner />
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </Button>

          <button
            onClick={() => setCommandOpen(true)}
            className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-md bg-sunken px-3 text-left text-[13px] text-faint shadow-[inset_0_0_0_1px_var(--line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--line-strong)]"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate">Search or jump to…</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => setNotifOpen(true)} className="relative">
              <Bell />
              {unread > 0 && (
                <span className="type-data absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-bold leading-4 text-accent-fg">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <button className="ml-1 rounded-full focus-visible:outline-2 focus-visible:outline-focus" aria-label="Account menu">
                  <Avatar name={user.full_name} src={user.profile_photo_url} size="sm" />
                </button>
              </MenuTrigger>
              <MenuContent className="w-60">
                <div className="px-2.5 pb-2 pt-1.5">
                  <div className="truncate text-sm font-semibold text-text">{user.full_name}</div>
                  <div className="truncate text-xs text-faint">{user.email}</div>
                </div>
                <MenuLabel>{ROLE_LABEL[role]}</MenuLabel>
                <MenuItem onSelect={() => navigate('/account')}>
                  <UserCircle2 /> Account & security
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => logout.mutate()}>
                  <LogOut /> Sign out
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>

        {isVolunteer && <ActiveShiftBanner />}
        {slot}

        <main id="main" className={cn('mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10', isVolunteer && 'pb-28 lg:pb-10')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Volunteer mobile bottom bar */}
      {isVolunteer && (
        <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-around rounded-2xl bg-raised/90 px-2 backdrop-blur-xl [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] lg:hidden">
          {NAV.Volunteer.flatMap((s) => s.items)
            .filter((i) => i.mobile)
            .map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cn('relative flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10.5px] font-medium', isActive ? 'text-accent-text' : 'text-faint')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="mobile-tab" className="absolute inset-0 rounded-xl bg-accent-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    <i.icon className="relative size-5" />
                    <span className="relative">{i.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            ))}
        </nav>
      )}

      <CommandPalette role={role} />
      <NotificationsPanel open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}
