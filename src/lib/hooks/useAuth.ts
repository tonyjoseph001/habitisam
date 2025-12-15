import { useState, useEffect } from 'react';
import { auth, app } from '../firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import { db } from '../db';
import { useSessionStore } from '../store/useSessionStore';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { setActiveProfile } = useSessionStore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            if (firebaseUser) {
                // Sync account to local DB
                try {
                    // Check if account exists, if not create/update
                    const account = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        lastLoginAt: new Date(),
                    };

                    await db.accounts.put(account as any); // 'put' updates or inserts

                    // Also try to find a parent profile for this account to set as active?
                    // Actually, we shouldn't auto-set active profile on simple auth state change 
                    // because we need the tailored login flow (Profile Switcher). 
                    // But for the very first login, we might need to know if profiles exist.
                } catch (error) {
                    console.error("Failed to sync account to Dexie:", error);
                }
            }
        });

        return () => unsubscribe();
    }, []);

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

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setActiveProfile(null);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return {
        user,
        loading,
        signInWithGoogle,
        signOut
    };
}
