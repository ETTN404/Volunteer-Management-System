import { AnimatePresence, motion } from 'motion/react';
import { Bell, ChevronRight, LayoutGrid, LogOut, Menu as MenuIcon, RefreshCw, Search, UserCircle2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/shared/lib/cn';
import { Avatar, Button, Kbd, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet, SheetContent, Tooltip } from '@/shared/ui';
import { useSession } from '@/features/auth/use-session';
import { useLogout, useMe } from '@/features/auth/api';
import { ROLE_LABEL } from '@/features/auth/session-store';
import { useNotifications } from '@/features/notifications/api';
import { useOpsDashboard } from '@/features/operations/api';
import { useDocumentQueue } from '@/features/documents/api';
import { EASE_OUT_EXPO } from '@/shared/motion';
import { useT } from '@/shared/i18n';
import { useUiStore } from '../ui-store';
import { NAV, findNavMatch } from '../navigation';
import { Sidebar, type NavBadges } from './sidebar';
import { CommandPalette } from './command-palette';
import { NotificationsPanel } from './notifications-panel';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import { ColdStartBanner } from './cold-start-banner';
import { ActiveShiftBanner } from '@/features/volunteer/components/active-shift-banner';
import { applyBrand } from '@/shared/lib/color';
import { useResolvedTheme } from '../providers/theme';

function useCoordinatorBadges(enabled: boolean): NavBadges {
  const dash = useOpsDashboard();
  const docs = useDocumentQueue('pending');
  if (!enabled) return {};
  return {
    applications: dash.data?.pending_applications,
    documents: docs.data?.length,
    hours: dash.data?.hours_to_verify,
  };
}

function CoordinatorBadges({ children }: { children: (b: NavBadges) => ReactNode }) {
  return <>{children(useCoordinatorBadges(true))}</>;
}

/** Floating surface used by the sidebar, top bar and content panel. */
const panel = 'bg-panel backdrop-blur-xl [box-shadow:var(--panel-shadow),inset_0_0_0_1px_var(--panel-ring)]';

/** Refetch everything on screen; spins while anything is loading. */
function RefreshButton() {
  const qc = useQueryClient();
  const busy = useIsFetching() > 0;
  const t = useT();
  return (
    <Tooltip content={t('Refresh')}>
      <Button variant="ghost" size="icon" aria-label={t('Refresh')} onClick={() => qc.invalidateQueries()}>
        <RefreshCw className={cn(busy && 'animate-spin [animation-duration:900ms]')} />
      </Button>
    </Tooltip>
  );
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
  const t = useT();
  const mainRef = useRef<HTMLElement>(null);
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

  // The content panel scrolls on its own (desktop) — start each page at the top.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  if (!user || !role) return null;
  const isVolunteer = role === 'Volunteer';
  const unread = notifications.data?.unread ?? 0;
  const match = findNavMatch(role, location.pathname);
  const pageTitle = match ? t(match.item.label) : t('Account & security');
  const deeper = match && location.pathname !== match.item.to;

  const sidebar = (badges: NavBadges) => (
    <aside
      className={cn(
        'fixed bottom-3 left-3 top-3 z-30 hidden overflow-hidden rounded-[26px] transition-[width] duration-300 ease-[var(--ease-out-expo)] lg:block',
        panel,
        collapsed ? 'w-[76px]' : 'w-[264px]',
      )}
    >
      <Sidebar role={role} user={user} org={org} collapsed={collapsed} onToggle={toggle} badges={badges} />
    </aside>
  );

  return (
    <div className="bg-contours min-h-dvh lg:h-dvh lg:overflow-hidden">
      <a href="#main" className="sr-only z-[70] rounded-md bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {t('Skip to content')}
      </a>

      {role === 'Coordinator' || role === 'OrgAdmin' ? <CoordinatorBadges>{(b) => sidebar(b)}</CoordinatorBadges> : sidebar({})}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent title={t('Menu')} side="left" width="sm" className="!p-0 lg:hidden">
          <div className="-mx-6 -my-5 h-[calc(100dvh-81px)]">
            <Sidebar role={role} user={user} org={org} collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-h-dvh flex-col gap-3 p-2 transition-[padding] duration-300 ease-[var(--ease-out-expo)] sm:p-3 lg:h-dvh lg:min-h-0',
          collapsed ? 'lg:pl-[100px]' : 'lg:pl-[288px]',
        )}
      >
        {/* Top bar: breadcrumb + page title, search, quick actions */}
        <header className={cn('sticky top-2 z-20 flex h-[68px] shrink-0 items-center gap-3 rounded-[22px] px-3 sm:top-3 sm:px-5 lg:static', panel)}>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('Open menu')} onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </Button>

          <div className="min-w-0 flex-1">
            <nav aria-label={t('Breadcrumb')} className="hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
              <LayoutGrid className="size-3.5 text-faint" />
              <span>{t('Workspace')}</span>
              {match?.section.label && (
                <>
                  <ChevronRight className="size-3 text-faint" />
                  <span>{t(match.section.label)}</span>
                </>
              )}
              <ChevronRight className="size-3 text-faint" />
              {deeper ? (
                <>
                  <NavLink to={match.item.to} className="hover:text-text">
                    {pageTitle}
                  </NavLink>
                  <ChevronRight className="size-3 text-faint" />
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent-text">{t('Details')}</span>
                </>
              ) : (
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent-text">{pageTitle}</span>
              )}
            </nav>
            <div className="type-title truncate text-[17px] text-text sm:mt-0.5 sm:text-[19px]">{pageTitle}</div>
          </div>

          <button
            onClick={() => setCommandOpen(true)}
            className="group hidden h-11 w-full max-w-[280px] items-center gap-2.5 rounded-[14px] bg-surface pl-1.5 pr-2 text-left text-[13.5px] text-faint [box-shadow:inset_0_0_0_1px_var(--line)] transition-shadow hover:[box-shadow:inset_0_0_0_1px_var(--line-strong)] md:flex"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-accent-soft text-accent-text">
              <Search className="size-4" />
            </span>
            <span className="flex-1 truncate">{t('Search anything')}</span>
            <span className="flex items-center gap-1">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('Search anything')} onClick={() => setCommandOpen(true)}>
              <Search />
            </Button>
            <LanguageToggle className="mx-1 hidden xl:flex" />
            <span className="hidden sm:inline-flex">
              <RefreshButton />
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label={unread ? t('Notifications, {n} unread', { n: unread }) : t('Notifications')} onClick={() => setNotifOpen(true)} className="relative">
              <Bell />
              {unread > 0 && (
                <span className="type-data absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-bold leading-4 text-accent-fg">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <button className="ml-1 rounded-full focus-visible:outline-2 focus-visible:outline-focus" aria-label={t('Account menu')}>
                  <Avatar name={user.full_name} src={user.profile_photo_url} size="sm" />
                </button>
              </MenuTrigger>
              <MenuContent className="w-60">
                <div className="px-2.5 pb-2 pt-1.5">
                  <div className="truncate text-sm font-semibold text-text">{user.full_name}</div>
                  <div className="truncate text-xs text-faint">{user.email}</div>
                </div>
                <MenuLabel>{t(ROLE_LABEL[role])}</MenuLabel>
                <MenuItem onSelect={() => navigate('/account')}>
                  <UserCircle2 /> {t('Account & security')}
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => logout.mutate()}>
                  <LogOut /> {t('Sign out')}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>

        {/* Content panel */}
        <main
          id="main"
          ref={mainRef}
          className={cn('relative flex-1 rounded-[26px] lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]', panel, '!bg-surface/95')}
        >
          <ColdStartBanner />
          {isVolunteer && <ActiveShiftBanner />}
          {slot}
          <div className={cn('mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9', isVolunteer && 'pb-28 lg:pb-9')}>
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
          </div>
        </main>
      </div>

      {/* Volunteer mobile bottom bar */}
      {isVolunteer && (
        <nav aria-label="Primary" className={cn('fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-around rounded-[22px] px-2 lg:hidden', panel)}>
          {NAV.Volunteer.flatMap((s) => s.items)
            .filter((i) => i.mobile)
            .map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cn('relative flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-[14px] text-[10.5px] font-medium', isActive ? 'text-accent-text' : 'text-faint')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="mobile-tab" className="absolute inset-0 rounded-[14px] bg-accent-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    <i.icon className="relative size-5" />
                    <span className="relative">{t(i.short ?? i.label)}</span>
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
