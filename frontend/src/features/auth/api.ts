import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { User } from '@/shared/types/api';
import { useSessionStore } from './session-store';

interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  user: User;
  role?: string;
  must_change_password?: boolean;
}

export interface RegisterInput {
  org_id?: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  password: string;
  skills?: string[];
  availability?: string[];
  bio?: string | null;
  date_of_birth?: string | null;
}

export interface InvitationInfo {
  email: string;
  first_name: string | null;
  full_name: string;
  role: string;
  organization: string | null;
  expires_at: string;
  usable: boolean;
  reason: 'used' | 'expired' | null;
}

export const authApi = {
  /** POST /login — `login` may be an email address or the user's full name. */
  login: async (login: string, password: string) => {
    const r = await http.post<AuthResponse>('/login', { email: login, password }, { skipAuthRedirect: true });
    return r.raw as unknown as AuthResponse;
  },
  register: async (input: RegisterInput) => {
    const r = await http.post<AuthResponse>('/register', input, { skipAuthRedirect: true });
    return r.raw as unknown as AuthResponse;
  },
  logout: () => http.post('/logout'),
  me: async () => (await http.get<User>('/user')).data,
  forgotPassword: (email: string) => http.post('/forgot-password', { email }, { skipAuthRedirect: true }),
  resetPassword: (input: { token: string; email: string; password: string; password_confirmation: string }) =>
    http.post('/reset-password', input, { skipAuthRedirect: true }),
  changePassword: (input: { current_password: string; password: string; password_confirmation: string }) =>
    http.patch('/account/password', input),
  updateAccount: async (input: { first_name?: string; last_name?: string; phone?: string | null }) =>
    (await http.patch<User>('/account', input)).data,
  invitation: async (token: string) => (await http.get<InvitationInfo>(`/invitations/${token}`, { skipAuthRedirect: true })).data,
  acceptInvitation: async (token: string, password: string) => {
    const r = await http.post<AuthResponse>(`/invitations/${token}/accept`, { password, password_confirmation: password }, { skipAuthRedirect: true });
    return r.raw as unknown as AuthResponse;
  },
  resendInvitation: (email: string) => http.post('/invitations/resend', { email }, { skipAuthRedirect: true }),
  deletePhoto: () => http.delete('/account/photo'),
  uploadPhoto: async (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return (await http.post<{ profile_photo_url: string }>('/account/photo', form)).data;
  },
};

export const authKeys = { me: ['auth', 'me'] as const };

/** Refresh the cached user from GET /user (role changes, suspension, profile edits). */
export function useMe() {
  const token = useSessionStore((s) => s.token);
  const setUser = useSessionStore((s) => s.setUser);
  return useQuery({
    queryKey: authKeys.me,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
  });
}

export function useLogin() {
  const signIn = useSessionStore((s) => s.signIn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ login, password }: { login: string; password: string }) => authApi.login(login, password),
    onSuccess: (res) => {
      qc.clear();
      signIn(res.access_token, res.user);
    },
  });
}

export function useRegister() {
  const signIn = useSessionStore((s) => s.signIn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      qc.clear();
      signIn(res.access_token, res.user);
    },
  });
}

export function useLogout() {
  const end = useSessionStore((s) => s.end);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      end('signed-out');
      qc.clear();
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      if (user?.must_change_password) setUser({ ...user, must_change_password: false });
      qc.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);
  return useMutation({
    mutationFn: authApi.updateAccount,
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useInvitation(token: string) {
  return useQuery({ queryKey: ['auth', 'invitation', token], queryFn: () => authApi.invitation(token), retry: false });
}

export function useAcceptInvitation() {
  const signIn = useSessionStore((s) => s.signIn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => authApi.acceptInvitation(token, password),
    onSuccess: (res) => {
      qc.clear();
      signIn(res.access_token, res.user);
    },
  });
}

export function useResendInvitation() {
  return useMutation({ mutationFn: authApi.resendInvitation });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.deletePhoto, onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }) });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.uploadPhoto,
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
