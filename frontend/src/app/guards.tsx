import { Navigate, Outlet, useLocation } from 'react-router';
import type { Role } from '@/shared/types/api';
import { useSession } from '@/features/auth/use-session';
import { ROLE_HOME } from '@/features/auth/session-store';

export function RequireAuth() {
  const { isAuthenticated } = useSession();
  const location = useLocation();
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { role } = useSession();
  if (!role) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to="/403" replace state={{ home: ROLE_HOME[role] }} />;
  return <Outlet />;
}

export function RedirectIfAuthed() {
  const { isAuthenticated, role } = useSession();
  if (isAuthenticated && role) return <Navigate to={ROLE_HOME[role]} replace />;
  return <Outlet />;
}

export function RoleRedirect() {
  const { role } = useSession();
  return <Navigate to={role ? ROLE_HOME[role] : '/login'} replace />;
}
