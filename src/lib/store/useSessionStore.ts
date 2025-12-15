import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile } from '../db';

interface SessionState {
    activeProfile: Profile | null;
    setActiveProfile: (profile: Profile | null) => void;

    // Theme might be derived from profile, but we can override locally
    currentTheme: 'cosmic' | 'enchanted' | 'admin';
    setTheme: (theme: 'cosmic' | 'enchanted' | 'admin') => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            activeProfile: null,
            setActiveProfile: (profile) => set({
                activeProfile: profile,
                // Auto-update theme based on profile type if profile is set
                currentTheme: profile?.theme || (profile?.type === 'parent' ? 'admin' : 'cosmic')
            }),

            currentTheme: 'admin', // Default start theme
            setTheme: (theme) => set({ currentTheme: theme }),
        }),
        {
            name: 'habitisim-session-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({ activeProfile: state.activeProfile, currentTheme: state.currentTheme }),
        }
    )
);
