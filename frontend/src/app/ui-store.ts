import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';

interface UiState {
  theme: ThemePref;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  /** Sidebar groups the user folded open/closed (key = role:label). */
  navGroups: Record<string, boolean>;
  setNavGroup: (key: string, open: boolean) => void;
  setTheme: (t: ThemePref) => void;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      commandOpen: false,
      navGroups: {},
      setNavGroup: (key, open) => set((s) => ({ navGroups: { ...s.navGroups, [key]: open } })),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
    }),
    {
      name: 'vt-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, navGroups: s.navGroups }),
    },
  ),
);
