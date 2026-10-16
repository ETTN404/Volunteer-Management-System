import { useSessionStore } from './session-store';

export function useSession() {
  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  return {
    token,
    user,
    role: user?.role ?? null,
    isAuthenticated: Boolean(token && user),
    orgId: user?.org_id ?? null,
  };
}
