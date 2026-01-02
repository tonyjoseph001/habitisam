"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    signOut as firebaseSignOut,
    signInWithCredential
} from 'firebase/auth';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { AccountService } from '@/lib/firestore/accounts.service';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firestore/core';

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
    const { activeProfile, setActiveProfile, reset } = useSessionStore();

    // INIT REMOVED: @capacitor-firebase/authentication does not require manual init calls in useEffect.

    // MEMBERSHIP GUARD: Watch for removal from household
    useEffect(() => {
        if (!user || !activeProfile?.accountId) return;

        // Skip check if user owns the account (can't remove self this way usually, but safe guard)
        // Actually, if I remove myself, I should be logged out too?
        // Let's just listen.



        const unsub = onSnapshot(doc(db, 'accounts', activeProfile.accountId), (snap: any) => {
            if (snap.exists()) {
                const data = snap.data();
                const members = data.members || [];

                // If current user is NO LONGER a member, force logout
                if (!members.includes(user.uid)) {
                    console.warn("🚨 User removed from household! Signing out...");
                    alert("You have been removed from this household.");
                    signOut();
                }
            } else {
                // Account deleted?
                console.warn("🚨 Household account not found! Signing out...");
                signOut();
            }
        });

        return () => unsub();
    }, [user, activeProfile?.accountId]); // Re-run if user or account context changes

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
                // Sync Dev Account
                AccountService.syncAccount(devUser).catch(e => console.error("Dev Account Sync Failed", e));
            }
        };
        // Run check if not loading and no user, or initially
        if (!user) {
            checkDevMode();
        }
    }, [user]);

    const signInWithGoogle = async () => {
        try {
            let userCredential: User;

            console.log("Current Platform:", Capacitor.getPlatform());

            if (Capacitor.isNativePlatform()) {
                console.log("STEP 1: Starting Native Google Sign-In with @capacitor-firebase/authentication");

                // 1. Native Sign-In (Plugin handles the Google Auth flow)
                const result = await FirebaseAuthentication.signInWithGoogle();
                console.log("STEP 2: Native Sign-In Success. User:", result.user);

                if (result.user) {
                    if (auth.currentUser) {
                        userCredential = auth.currentUser;
                        // alert("STEP 3: Login Success! Welcome " + userCredential.displayName);
                        console.log("STEP 3: Login Success via Listener! Welcome " + userCredential.displayName);
                    } else {
                        console.warn("Plugin signed in, but auth.currentUser is null. Using manual credential sync.");
                        if (result.credential?.idToken) {
                            const cred = GoogleAuthProvider.credential(result.credential.idToken);
                            const manualRes = await signInWithCredential(auth, cred);
                            userCredential = manualRes.user;
                            console.log("STEP 3 (Manual Sync): Login Success! Welcome " + userCredential.displayName);
                            // alert("STEP 3 (Manual Sync): Login Success! Welcome " + userCredential.displayName);
                        } else {
                            throw new Error("Login failed: No user and no ID token.");
                        }
                    }
                } else {
                    throw new Error("Native Login cancelled or failed.");
                }

            } else {
                console.log("STEP 1 (Web): Detected Web Platform. Using signInWithPopup.");
                // Web Sign-In
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                userCredential = result.user;
            }

            // Sync Account
            await AccountService.syncAccount(userCredential);
            return userCredential;
        } catch (error: any) {
            alert("LOGIN ERROR: " + error.message);
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInAnonymouslyUser = async () => {
        try {
            const result = await signInAnonymously(auth);
            await AccountService.syncAccount(result.user);
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
            // Universal cleanup
            reset(); // Clear session store (activeProfile, theme)
            localStorage.removeItem('habitisim-session-storage'); // Clear persisted session

            if (localStorage.getItem('habitisim_dev_mode')) {
                localStorage.removeItem('habitisim_dev_mode');
                setUser(null);
                return;
            }
            if (Capacitor.isNativePlatform()) {
                await FirebaseAuthentication.signOut();
            }
            await firebaseSignOut(auth);
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
