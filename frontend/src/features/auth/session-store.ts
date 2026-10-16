import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Role, User } from '@/shared/types/api';

export type SessionEndReason = 'expired' | 'suspended' | 'signed-out' | null;

interface SessionState {
  token: string | null;
  user: User | null;
  endedReason: SessionEndReason;
  suspendedMessage: string | null;
  signIn: (token: string, user: User) => void;
  setUser: (user: User) => void;
  end: (reason: Exclude<SessionEndReason, null>, message?: string) => void;
  clearEndReason: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      endedReason: null,
      suspendedMessage: null,
      signIn: (token, user) => set({ token, user, endedReason: null, suspendedMessage: null }),
      setUser: (user) => set({ user }),
      end: (reason, message) => set({ token: null, user: null, endedReason: reason, suspendedMessage: message ?? null }),
      clearEndReason: () => set({ endedReason: null, suspendedMessage: null }),
    }),
    {
      name: 'vt-session',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);

export const getToken = () => useSessionStore.getState().token;

/** Workspace root per role — the single source of truth for post-login routing. */
export const ROLE_HOME: Record<Role, string> = {
  Volunteer: '/v',
  Coordinator: '/c',
  OrgAdmin: '/o',
  SuperAdmin: '/p',
};

export const ROLE_LABEL: Record<Role, string> = {
  Volunteer: 'Volunteer',
  Coordinator: 'Coordinator',
  OrgAdmin: 'Organization admin',
  SuperAdmin: 'Platform admin',
};
