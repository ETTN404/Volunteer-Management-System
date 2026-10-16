import { Command } from 'cmdk';
import { Dialog as D } from 'radix-ui';
import { ArrowRight, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Role } from '@/shared/types/api';
import { Kbd } from '@/shared/ui';
import { useLogout } from '@/features/auth/api';
import { NAV } from '../navigation';
import { useUiStore } from '../ui-store';
import { useSetTheme } from '../providers/theme';

const QUICK: Record<Role, { label: string; to: string }[]> = {
  Volunteer: [
    { label: 'Find a shift that matches my skills', to: '/v/opportunities' },
    { label: 'Check in to my current shift', to: '/v/schedule' },
    { label: 'Download a certificate', to: '/v/certificates' },
    { label: 'Upload a document', to: '/v/documents' },
    { label: 'Ask VolunBot', to: '/v/assistant' },
  ],
  Coordinator: [
    { label: 'Create an event', to: '/c/events/new' },
    { label: 'Review applications', to: '/c/applications' },
    { label: 'Open a live shift (QR + roster)', to: '/c/live' },
    { label: 'Verify logged hours', to: '/c/hours' },
    { label: 'Post an announcement', to: '/c/announcements' },
    { label: 'Generate an impact report', to: '/c/reports' },
  ],
  OrgAdmin: [
    { label: 'Add a coordinator', to: '/o/team' },
    { label: 'Edit organization branding', to: '/o/settings' },
    { label: 'Create an event', to: '/c/events/new' },
    { label: 'View impact reports', to: '/o/reports' },
  ],
  SuperAdmin: [
    { label: 'Onboard a new organization', to: '/p/onboard' },
    { label: 'Review the audit trail', to: '/p/audit' },
    { label: 'Find a user', to: '/p/users' },
  ],
};

const item =
  'flex h-10 cursor-default items-center gap-3 rounded-md px-3 text-sm text-text aria-selected:bg-surface-2 [&_svg]:size-4 [&_svg]:text-faint';

export function CommandPalette({ role }: { role: Role }) {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const setTheme = useSetTheme();
  const logout = useLogout();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgba(3,12,13,0.55)] backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <D.Content className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl bg-raised [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] data-[state=open]:animate-[pop-in_180ms_var(--ease-out-expo)]">
          <D.Title className="sr-only">Command menu</D.Title>
          <D.Description className="sr-only">Search pages and actions</D.Description>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-faint" />
              <Command.Input autoFocus placeholder="Search pages and actions…" className="h-13 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-faint" />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:type-eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted">Nothing matches that. Try a page name.</Command.Empty>
              <Command.Group heading="Do something">
                {QUICK[role].map((q) => (
                  <Command.Item key={q.label} value={q.label} onSelect={() => run(() => navigate(q.to))} className={item}>
                    <ArrowRight />
                    {q.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Go to">
                {NAV[role].flatMap((s) => s.items).map((n) => (
                  <Command.Item key={n.to} value={`go ${n.label}`} onSelect={() => run(() => navigate(n.to))} className={item}>
                    <n.icon />
                    {n.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Preferences">
                <Command.Item value="theme light" onSelect={() => run(() => setTheme('light'))} className={item}>
                  <Sun /> Light theme
                </Command.Item>
                <Command.Item value="theme dark" onSelect={() => run(() => setTheme('dark'))} className={item}>
                  <Moon /> Dark theme
                </Command.Item>
                <Command.Item value="theme system" onSelect={() => run(() => setTheme('system'))} className={item}>
                  <Monitor /> Match system theme
                </Command.Item>
                <Command.Item value="sign out" onSelect={() => run(() => logout.mutate())} className={item}>
                  <LogOut /> Sign out
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
