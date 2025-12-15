"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<User>;
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
                // Sync account to local DB
                try {
                    const account = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        lastLoginAt: new Date(),
                    };
                    await db.accounts.put(account as any);
                } catch (error) {
                    console.error("Failed to sync account to Dexie:", error);
                }
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

    const signInAsDev = async () => {
        const devUser = {
            uid: 'dev-user-123',
            email: 'dev@habitisim.app',
            displayName: 'Dev Parent',
            photoURL: null,
        } as unknown as User;

        try {
            const account = {
                uid: devUser.uid,
                email: devUser.email,
                displayName: devUser.displayName,
                photoURL: devUser.photoURL,
                createdAt: new Date(),
                lastLoginAt: new Date(),
            };
            await db.accounts.put(account as any);
        } catch (e) {
            console.error("Dev sync failed", e);
        }

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
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInAsDev, signOut }}>
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
