import { ArrowLeft, Compass, LockKeyhole, ShieldOff, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, isRouteErrorResponse, useLocation, useRouteError } from 'react-router';
import { Button, LogoMark, Spinner } from '@/shared/ui';
import { hasNewerBuild, reloadOnce } from '@/app/version';
import { useSession } from '@/features/auth/use-session';
import { ROLE_HOME, useSessionStore } from '@/features/auth/session-store';

function Shell({ icon, code, title, body, actions }: { icon: ReactNode; code: string; title: string; body: ReactNode; actions: ReactNode }) {
  return (
    <div className="bg-contours relative grid min-h-dvh place-items-center overflow-hidden bg-bg px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line-strong opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line opacity-80" />
      <div className="relative max-w-md text-center">
        <Link to="/" className="mb-10 inline-flex" aria-label="VolunTrack home">
          <LogoMark className="size-10" />
        </Link>
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-surface-2 text-accent-text [&_svg]:size-6">{icon}</div>
        <p className="type-eyebrow mb-3">{code}</p>
        <h1 className="type-headline text-3xl text-text">{title}</h1>
        <div className="mt-3 text-[15px] text-muted">{body}</div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

function HomeButton() {
  const { role } = useSession();
  return (
    <Button asChild>
      <Link to={role ? ROLE_HOME[role] : '/'}>
        <ArrowLeft /> {role ? 'Back to my workspace' : 'Back to home'}
      </Link>
    </Button>
  );
}

export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <Shell
      icon={<Compass />}
      code="404 · outside the geofence"
      title="This page isn’t on the map"
      body={
        <>
          Nothing lives at <span className="type-data text-text">{pathname}</span>. It may have moved, or the link is mistyped.
        </>
      }
      actions={<HomeButton />}
    />
  );
}

export function ForbiddenPage() {
  return (
    <Shell
      icon={<LockKeyhole />}
      code="403 · restricted area"
      title="Your role can’t open this page"
      body="Each workspace is limited to the people who run it. If you need access, ask your organization admin."
      actions={<HomeButton />}
    />
  );
}

export function SuspendedPage() {
  const message = useSessionStore((s) => s.suspendedMessage);
  const clear = useSessionStore((s) => s.clearEndReason);
  return (
    <Shell
      icon={<ShieldOff />}
      code="Organization suspended"
      title="Access is paused for your organization"
      body={message ?? 'Your organization account has been suspended. Contact the platform administrator to restore access.'}
      actions={
        <>
          <Button asChild variant="secondary" onClick={clear}>
            <Link to="/login">Sign in with another account</Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="mailto:support@voluntrack.org">Contact support</a>
          </Button>
        </>
      }
    />
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const message = error instanceof Error ? error.message : 'An unexpected error stopped this page from loading.';
  const chunk = /dynamically imported module|Failed to fetch|module script|Importing a module/i.test(message);
  // Most crashes right after a deploy come from an old tab mixing old and new code:
  // if a newer build exists, reload into it once instead of showing the error.
  const [updating, setUpdating] = useState(chunk);
  useEffect(() => {
    let alive = true;
    if (notFound) return;
    void hasNewerBuild().then((n) => {
      if (!alive) return;
      if ((n || chunk) && reloadOnce()) return;
      setUpdating(false);
    });
    return () => {
      alive = false;
    };
  }, [chunk, notFound]);
  if (notFound) return <NotFoundPage />;
  if (updating)
    return (
      <div className="grid min-h-dvh place-items-center bg-bg" aria-busy="true" aria-label="Updating VolunTrack">
        <Spinner />
      </div>
    );
  return (
    <Shell
      icon={<TriangleAlert />}
      code={chunk ? 'Update available' : 'Something broke'}
      title={chunk ? 'A newer version is available' : 'This page hit an error'}
      body={chunk ? 'Reload to get the latest version of VolunTrack.' : message}
      actions={
        <>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <HomeButton />
        </>
      }
    />
  );
}
