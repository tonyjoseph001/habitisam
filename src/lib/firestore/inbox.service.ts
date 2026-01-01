import { db } from './core';
import { converter, removeUndefined } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { InboxReward } from '@/lib/db';

const COLLECTION_NAME = 'inboxRewards';

export const InboxService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<InboxReward>()),

    getByAccountId: async (accountId: string): Promise<InboxReward[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<InboxReward>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    getPendingForProfile: async (accountId: string, profileId: string): Promise<InboxReward[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<InboxReward>()),
            where('accountId', '==', accountId),
            where('profileId', '==', profileId),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    add: async (item: InboxReward) => {
        const ref = doc(db, COLLECTION_NAME, item.id).withConverter(converter<InboxReward>());
        await setDoc(ref, item);
    },

    update: async (id: string, updates: Partial<InboxReward>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, removeUndefined(updates));
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    },

    claim: async (item: InboxReward) => {
        await runTransaction(db, async (transaction) => {
            const inboxRef = doc(db, COLLECTION_NAME, item.id);
            const profileRef = doc(db, 'profiles', item.profileId);
            const logRef = doc(collection(db, 'activityLogs'));

            transaction.update(inboxRef, {
                status: 'claimed',
                claimedAt: new Date()
            });

            if (item.amount > 0) {
                const profileSnap = await transaction.get(profileRef);
                if (profileSnap.exists()) {
                    const currentStars = profileSnap.data().stars || 0;
                    transaction.update(profileRef, { stars: currentStars + item.amount });

                    transaction.set(logRef, {
                        id: logRef.id,
                        accountId: item.accountId,
                        profileId: item.profileId,
                        activityId: 'manual_reward',
                        date: new Date().toISOString(),
                        status: 'completed',
                        starsEarned: item.amount,
                        metadata: {
                            reason: item.message || "Reward Claimed",
                            type: "manual_award"
                        }
                    });
                }
            }
        });
    }
}
