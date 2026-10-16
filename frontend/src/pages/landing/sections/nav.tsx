import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { Button, Logo } from '@/shared/ui';
import { useSession } from '@/features/auth/use-session';
import { ROLE_HOME } from '@/features/auth/session-store';
import { useResolvedTheme, useSetTheme } from '@/app/providers/theme';

export const NAV_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#volunteers', label: 'For volunteers' },
  { href: '#check-in', label: 'Verified check-in' },
  { href: '#how', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role } = useSession();
  const theme = useResolvedTheme();
  const setTheme = useSetTheme();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          'mx-auto flex h-[60px] max-w-[1180px] items-center gap-4 rounded-full pl-4 pr-2 transition-[background-color,box-shadow,backdrop-filter] duration-500',
          scrolled ? 'bg-surface/80 backdrop-blur-xl [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]' : 'bg-transparent',
        )}
      >
        <Link to="/" aria-label="VolunTrack home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          {isAuthenticated && role ? (
            <Button asChild>
              <Link to={ROLE_HOME[role]}>
                Open workspace <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-muted hover:text-text sm:block">
                Sign in
              </Link>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
          <button className="grid size-9 place-items-center rounded-full text-text hover:bg-surface-2 lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 max-w-[1180px] rounded-3xl bg-surface p-2 [box-shadow:var(--elev-3),inset_0_0_0_1px_var(--line)] lg:hidden"
          >
            {[...NAV_LINKS, { href: '/verify', label: 'Verify a certificate' }, { href: '/login', label: 'Sign in' }].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-text hover:bg-surface-2">
                {l.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
