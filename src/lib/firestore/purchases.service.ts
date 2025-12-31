import { db } from './core';
import { converter } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, runTransaction } from 'firebase/firestore';
import { PurchaseLog } from '@/lib/db';

const COLLECTION_NAME = 'purchaseLogs';

export const PurchaseService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<PurchaseLog>()),

    getByAccountId: async (accountId: string): Promise<PurchaseLog[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<PurchaseLog>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    getPending: async (accountId: string): Promise<PurchaseLog[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<PurchaseLog>()),
            where('accountId', '==', accountId),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    add: async (log: PurchaseLog) => {
        const ref = doc(db, COLLECTION_NAME, log.id).withConverter(converter<PurchaseLog>());
        await setDoc(ref, log);
    },

    update: async (id: string, updates: Partial<PurchaseLog>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, updates);
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    },

    approve: async (log: PurchaseLog) => {
        await runTransaction(db, async (transaction) => {
            const logRef = doc(db, COLLECTION_NAME, log.id);
            const profileRef = doc(db, 'profiles', log.profileId);
            const inboxRef = doc(collection(db, 'inboxRewards'));

            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists()) {
                throw new Error("Profile not found");
            }

            const currentStars = profileSnap.data().stars || 0;
            const cost = log.rewardSnapshot.cost;
            const newStars = Math.max(0, currentStars - cost);

            transaction.update(profileRef, { stars: newStars });

            // Update log status
            // Note: firestore transactions require reads before writes, but set/update/delete order doesn't matter for logic as long as reads are first?
            // Actually writes are queued.
            transaction.update(logRef, { status: 'approved', processedAt: new Date() });

            // Add notification
            transaction.set(inboxRef, {
                id: inboxRef.id,
                accountId: log.accountId,
                profileId: log.profileId,
                amount: 0,
                message: `Request Approved: ${log.rewardSnapshot.title}`,
                senderName: "Parent",
                status: 'pending',
                createdAt: new Date()
            });
        });
    },

    reject: async (log: PurchaseLog) => {
        await runTransaction(db, async (transaction) => {
            const logRef = doc(db, COLLECTION_NAME, log.id);
            const inboxRef = doc(collection(db, 'inboxRewards'));

            transaction.update(logRef, { status: 'rejected', processedAt: new Date() });

            transaction.set(inboxRef, {
                id: inboxRef.id,
                accountId: log.accountId,
                profileId: log.profileId,
                amount: 0,
                message: `Request Rejected: ${log.rewardSnapshot.title}`,
                senderName: "Parent",
                status: 'pending',
                createdAt: new Date()
            });
        });
    },

    claimInstant: async (log: PurchaseLog) => {
        await runTransaction(db, async (transaction) => {
            const profileRef = doc(db, 'profiles', log.profileId);
            const logRef = doc(db, COLLECTION_NAME, log.id);

            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists()) {
                throw new Error("Profile not found");
            }

            const currentStars = profileSnap.data().stars || 0;
            const cost = log.rewardSnapshot.cost;
            const newStars = Math.max(0, currentStars - cost);

            transaction.update(profileRef, { stars: newStars });
            // For claimInstant, the log is NEW, so we use set.
            transaction.set(logRef, log);
        });
    }
}
