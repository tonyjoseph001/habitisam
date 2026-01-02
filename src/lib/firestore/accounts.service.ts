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
            // Check for Account Recovery by Email (Migration Scenario)
            if (user.email) {
                const emailQuery = query(collection(db, COLLECTION), where('email', '==', user.email));
                const emailSnap = await getDocs(emailQuery);

                if (!emailSnap.empty) {
                    const oldAccountDoc = emailSnap.docs[0];
                    const oldData = oldAccountDoc.data();
                    console.log(`♻️ Found existing account by email (${user.email}). Migrating ${oldAccountDoc.id} -> ${user.uid}...`);

                    // 1. Migrate Child Collections
                    await AccountService.migrateAccountData(oldAccountDoc.id, user.uid);

                    // 2. Prepare New Account Data
                    const mergedAccount: any = {
                        ...oldData,
                        uid: user.uid, // NEW UID
                        status: 'active',
                        deactivatedAt: null,
                        lastLoginAt: now,
                    };

                    // Fix members array: Replace old UID with new UID
                    if (mergedAccount.members && Array.isArray(mergedAccount.members)) {
                        mergedAccount.members = mergedAccount.members.map((m: string) => m === oldAccountDoc.id ? user.uid : m);
                    } else {
                        mergedAccount.members = [user.uid];
                    }

                    // 3. Create New Root & Delete Old
                    const batch = writeBatch(db);
                    batch.set(accountRef, mergedAccount);
                    batch.delete(oldAccountDoc.ref);
                    await batch.commit();

                    console.log("✅ Migration Complete.");
                    return;
                }
            }

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

                status: 'active',
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

            // Reactivate if previously deactivated
            if (data.status === 'deactivated') {
                updates.status = 'active';
                updates.deactivatedAt = null;
                console.log("♻️ Account Reactivated:", user.uid);
            }

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
    },

    /**
     * NUCLEAR OPTION: Completely deletes a user's Firestore data.
     * 1. Deletes their personal 'accounts/{uid}' doc.
     * 2. Deletes all profiles owned by them (including the one in the household).
     * @param uid The user ID to wipe
     * @param protectedUid Optional: If provided, ensures we don't delete this specific UID (e.g. the Household Owner)
     */
    deleteFullAccount: async (uid: string, protectedUid?: string) => {
        if (!uid) return;
        if (protectedUid && uid === protectedUid) {
            throw new Error("Security Violation: Cannot deactivate the primary household owner account.");
        }

        const COLLECTIONS_TO_WIPE = [
            'profiles',
            'activities',
            'activityLogs',
            'rewards',
            'purchaseLogs',
            'inboxRewards',
            'goals'
        ];

        let batch = writeBatch(db);
        let opCount = 0;
        const BATCH_LIMIT = 400;

        // 1. Deactivate Root Account (Soft Delete)
        const accountRef = doc(db, COLLECTION, uid);
        batch.update(accountRef, {
            status: 'deactivated',
            deactivatedAt: new Date()
        });
        opCount++;

        // 2. Delete ALL Household Data from all tables
        for (const colName of COLLECTIONS_TO_WIPE) {
            const q = query(collection(db, colName), where('accountId', '==', uid));
            const snap = await getDocs(q);

            for (const docSnap of snap.docs) {
                batch.delete(docSnap.ref);
                opCount++;

                if (opCount >= BATCH_LIMIT) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }
    },

    /**
     * Helper: Moves all child data from Old UID to New UID.
     */
    migrateAccountData: async (oldUid: string, newUid: string) => {
        const COLLECTIONS = [
            'profiles',
            'activities',
            'activityLogs',
            'rewards',
            'purchaseLogs',
            'inboxRewards',
            'goals'
        ];

        // Process in batches
        let batch = writeBatch(db);
        let count = 0;
        const BATCH_LIMIT = 400;

        for (const colName of COLLECTIONS) {
            const q = query(collection(db, colName), where('accountId', '==', oldUid));
            const snap = await getDocs(q);

            for (const docSnap of snap.docs) {
                const updateData: any = { accountId: newUid };

                // If profile owned by old user, transfer ownership
                if (colName === 'profiles') {
                    const pData = docSnap.data();
                    if (pData.ownerUid === oldUid) {
                        updateData.ownerUid = newUid;
                    }
                }

                batch.update(docSnap.ref, updateData);
                count++;

                if (count >= BATCH_LIMIT) {
                    await batch.commit();
                    batch = writeBatch(db); // New batch
                    count = 0;
                }
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`📦 Migrated documents from ${oldUid} to ${newUid}`);
        }
    }
};
