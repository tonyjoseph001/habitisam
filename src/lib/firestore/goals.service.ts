import { db } from './core';
import { converter, removeUndefined } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, runTransaction, deleteField } from 'firebase/firestore';
import { Goal } from '@/lib/db';

const COLLECTION_NAME = 'goals';

export const GoalService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Goal>()),

    getByAccountId: async (accountId: string): Promise<Goal[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<Goal>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    add: async (goal: Goal) => {
        const ref = doc(db, COLLECTION_NAME, goal.id).withConverter(converter<Goal>());
        await setDoc(ref, goal);
    },

    update: async (id: string, updates: Partial<Goal>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, removeUndefined(updates));
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    },

    approve: async (goal: Goal, starsEarned: number) => {
        await runTransaction(db, async (transaction) => {
            const goalRef = doc(db, COLLECTION_NAME, goal.id);
            const profileRef = doc(db, 'profiles', goal.profileId);
            const logRef = doc(collection(db, 'activityLogs'));

            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists()) throw new Error("Profile not found");

            const currentStars = profileSnap.data().stars || 0;
            const newStars = currentStars + starsEarned;

            transaction.update(profileRef, { stars: newStars });

            transaction.update(goalRef, {
                status: 'completed',
                completedAt: new Date()
            });

            transaction.set(logRef, {
                id: logRef.id,
                accountId: goal.accountId,
                profileId: goal.profileId,
                activityId: goal.id,
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                completedAt: new Date(),
                starsEarned: starsEarned,
                metadata: {
                    type: 'goal_completion',
                    goalTitle: goal.title
                }
            });
        });
    },

    reject: async (goal: Goal) => {
        await runTransaction(db, async (transaction) => {
            const goalRef = doc(db, COLLECTION_NAME, goal.id);
            transaction.update(goalRef, {
                status: 'active',
                current: 0,
                completedAt: deleteField()
            });
        });
    }
}
