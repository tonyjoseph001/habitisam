import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
    getDocs,
    query,
    where,
    arrayRemove,
    writeBatch
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
            // Check if user is already a member of another household?
            // For now, simplicity: A user always creates their own "Household" on signup.
            // When they join another, we might handle switching context.
            // BUT: If they join another, their own household becomes dormant?
            // Actually, `useAccount` determines which one checks out.

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

                members: [user.uid], // Initialize with self

                createdAt: now,
                lastLoginAt: now
            };

            await setDoc(accountRef, newAccount);
            console.log("🆕 Account Created:", user.uid);
        } else {
            // UPDATE EXISTING ACCOUNT
            const data = snapshot.data();
            const updates: any = {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLoginAt: now
            };

            // Migration: Ensure members exists
            if (!data.members) {
                updates.members = [user.uid];
            }

            await updateDoc(accountRef, updates);
            console.log("🔄 Account Synced:", user.uid);
        }
    },

    /**
     * Adds a user to an existing household.
     */
    async joinHousehold(user: User, targetAccountId: string): Promise<void> {
        if (!targetAccountId) throw new Error("Target Account ID required");

        // 1. Add user to the target account's members list
        const accountRef = doc(db, COLLECTION, targetAccountId);
        const accountSnap = await getDoc(accountRef);

        if (!accountSnap.exists()) throw new Error("Household not found");

        const currentMembers = accountSnap.data().members || [];
        if (!currentMembers.includes(user.uid)) {
            await updateDoc(accountRef, {
                members: [...currentMembers, user.uid]
            });
        }

        // 2. Note: The user might still have their "own" account document from syncAccount.
        // That's okay. Our `useAccount` hook will prioritize the account where they are a member 
        // OR we just assume they use the one they joined.
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
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
                lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt)
            } as Account;
        }
        return null;
    },

    /**
     * Finds all accounts the user is a member of.
     */
    async getForUser(uid: string): Promise<Account[]> {
        if (!uid) return [];
        const { query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, COLLECTION), where('members', 'array-contains', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
                lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt)
            } as Account;
        });
    },

    /**
     * Removes a member from a household.
     */
    async removeMember(accountId: string, uidToRemove: string): Promise<void> {
        if (!accountId || !uidToRemove) return;
        const ref = doc(db, COLLECTION, accountId);
        await updateDoc(ref, {
            members: arrayRemove(uidToRemove)
        });
    },

    /**
     * Atomically remove a parent:
     * 1. Remove UID from Account members.
     * 2. Delete Profile document.
     */
    removeParent: async (accountId: string, memberUid: string, profileId: string) => {
        const batch = writeBatch(db);

        // 1. Remove from Account
        const accountRef = doc(db, COLLECTION, accountId);
        batch.update(accountRef, {
            members: arrayRemove(memberUid)
        });

        // 2. Delete Profile
        const profileRef = doc(db, 'profiles', profileId);
        batch.delete(profileRef);

        await batch.commit();
    }
};
