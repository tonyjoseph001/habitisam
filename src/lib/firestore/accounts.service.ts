import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firestore/core';
import { Account } from '@/lib/db';
import { User } from 'firebase/auth';

const COLLECTION = 'accounts';

export const AccountService = {
    /**
     * Syncs the Firebase Auth User with the Firestore Account document.
     * Creates the document if it doesn't exist.
     * Updates lastLoginAt and basic profile info if it does.
     */
    async syncAccount(user: User): Promise<void> {
        if (!user || !user.uid) return;

        const accountRef = doc(db, COLLECTION, user.uid);
        const snapshot = await getDoc(accountRef);

        const now = new Date();

        if (!snapshot.exists()) {
            // CREATE NEW ACCOUNT
            const newAccount: Account = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,

                // Default License
                licenseType: 'free',
                licenseExpiry: null,
                isPaid: false,
                subscriptionStatus: 'none',

                createdAt: now,
                lastLoginAt: now
            };

            await setDoc(accountRef, newAccount);
            console.log("🆕 Account Created:", user.uid);
        } else {
            // UPDATE EXISTING ACCOUNT
            // Only update generic fields to keep custom data intact
            await updateDoc(accountRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLoginAt: now
            });
            console.log("🔄 Account Synced:", user.uid);
        }
    },

    /**
     * Upgrades the user's subscription to 'pro' and sets expiry based on interval.
     */
    async upgradeSubscription(uid: string, plan: 'monthly' | 'annual'): Promise<void> {
        if (!uid) return;
        const accountRef = doc(db, COLLECTION, uid);

        const now = new Date();
        let expiryDate = new Date();

        if (plan === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        await updateDoc(accountRef, {
            licenseType: 'pro',
            isPaid: true,
            subscriptionStatus: 'active',
            billingInterval: plan,
            licenseExpiry: expiryDate.toISOString(),
            lastLoginAt: now // Update activity
        });

        console.log(`🚀 Account Upgraded: ${uid} -> ${plan}`);
    },

    async get(uid: string): Promise<Account | null> {
        if (!uid) return null;
        const snapshot = await getDoc(doc(db, COLLECTION, uid));
        if (snapshot.exists()) {
            const data = snapshot.data();
            // Convert Timestamps back to Date objects if needed (though Firestore SDK often handles this)
            return {
                ...data,
                // Ensure dates are Date objects
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
                lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt)
            } as Account;
        }
        return null;
    }
};
