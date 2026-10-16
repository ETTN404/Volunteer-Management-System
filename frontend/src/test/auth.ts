import { authApi } from '@/features/auth/api';
import { useSessionStore } from '@/features/auth/session-store';

export const DEMO = {
  superadmin: 'superadmin@vms.com',
  orgadmin: 'redcross.admin@vms.com',
  coordinator: 'redcross.coord@vms.com',
  volunteer: 'redcross.vol@vms.com',
  otherVolunteer: 'savechildren.vol@vms.com',
  otherCoordinator: 'savechildren.coord@vms.com',
} as const;

/** Sign in through the real login endpoint (mocked) and put the session in the store. */
export async function signInAs(email: string) {
  const res = await authApi.login(email, 'password');
  useSessionStore.getState().signIn(res.access_token, res.user);
  return res.user;
}
