import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/session-store';
import { LogoMark, notify } from '@/shared/ui';

/** Reacts to session endings triggered by the HTTP layer (401 / suspended org). */
function SessionWatcher() {
  const reason = useSessionStore((s) => s.endedReason);
  const clear = useSessionStore((s) => s.clearEndReason);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!reason) return;
    qc.clear();
    if (reason === 'expired') {
      notify.warning('Your session ended', 'Sign in again to continue where you left off.');
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    } else if (reason === 'suspended') {
      navigate('/suspended', { replace: true });
    } else if (reason === 'signed-out') {
      notify.success('Signed out');
      navigate('/login', { replace: true });
    }
    if (reason !== 'suspended') clear();
  }, [reason, clear, navigate, qc]);

  return null;
}

export function Root() {
  return (
    <>
      <SessionWatcher />
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** Shown while the first route module loads. */
export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-label="Loading VolunTrack">
      <div className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full border border-dashed border-accent/60" />
        <span className="absolute inset-0 animate-ping-ring rounded-full border border-accent/40" />
        <LogoMark className="size-10" />
      </div>
    </div>
  );
}
