import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile, ThemeType } from '../db';

interface SessionState {
    activeProfile: Profile | null;
    setActiveProfile: (profile: Profile | null) => void;

    // Theme might be derived from profile, but we can override locally
    currentTheme: ThemeType;
    setTheme: (theme: ThemeType) => void;

    hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            hasHydrated: false,
            setHasHydrated: (state) => set({ hasHydrated: state }),
            activeProfile: null,
            setActiveProfile: (profile) => set({
                activeProfile: profile,
                // Auto-update theme based on profile type if profile is set
                currentTheme: profile?.theme || 'default'
            }),

            currentTheme: 'default', // Default start theme
            setTheme: (theme) => set({ currentTheme: theme }),
        }),
        {
            name: 'habitisim-session-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({ activeProfile: state.activeProfile, currentTheme: state.currentTheme }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
