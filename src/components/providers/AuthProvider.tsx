"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { useSessionStore } from '@/lib/store/useSessionStore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<User>;
    signInAnonymouslyUser: () => Promise<void>;
    signInAsDev: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { setActiveProfile } = useSessionStore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // DEV BYPASS: Check for persisted dev session on mount
    useEffect(() => {
        const checkDevMode = () => {
            // Determine if we are in emulator mode
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const emulatorEnv = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
            const isEmulator = emulatorEnv === 'true' || (emulatorEnv !== 'false' && isLocalhost);

            // Disable dev bypass in production
            if (!isEmulator) {
                if (localStorage.getItem('habitisim_dev_mode')) {
                    console.warn("⚠️ Production detected: Clearing Dev Mode session");
                    localStorage.removeItem('habitisim_dev_mode');
                }
                return;
            }

            const isDev = localStorage.getItem('habitisim_dev_mode');
            if (isDev === 'true' && !user) {
                const devUser = {
                    uid: 'dev-user-123',
                    email: 'dev@habitisim.app',
                    displayName: 'Dev Parent',
                    photoURL: null,
                    emailVerified: true,
                    isAnonymous: false,
                    metadata: {},
                    providerData: [],
                    refreshToken: '',
                    tenantId: null,
                    delete: async () => { },
                    getIdToken: async () => 'mock-token',
                    getIdTokenResult: async () => ({} as any),
                    reload: async () => { },
                    toJSON: () => ({}),
                    phoneNumber: null,
                    providerId: 'google.com',
                } as unknown as User;

                setUser(devUser);
                setLoading(false);
            }
        };
        // Run check if not loading and no user, or initially
        if (!user) {
            checkDevMode();
        }
    }, [user]);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            return result.user;
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInAnonymouslyUser = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error signing in anonymously", error);
            throw error;
        }
    };

    const signInAsDev = async () => {
        const devUser = {
            uid: 'dev-user-123',
            email: 'dev@habitisim.app',
            displayName: 'Dev Parent',
            photoURL: null,
            // ... (rest of object, can be simplified for this specific edit if needed, but safer to replace)
        } as unknown as User;

        localStorage.setItem('habitisim_dev_mode', 'true');
        setUser(devUser);
    };

    const signOut = async () => {
        try {
            if (localStorage.getItem('habitisim_dev_mode')) {
                localStorage.removeItem('habitisim_dev_mode');
                setUser(null);
                setActiveProfile(null);
                return;
            }
            await firebaseSignOut(auth);
            setActiveProfile(null);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAnonymouslyUser, signInAsDev, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
