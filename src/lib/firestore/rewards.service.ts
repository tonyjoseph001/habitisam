import { db } from './core';
import { converter, removeUndefined } from './converters';
import { collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Reward } from '@/lib/db';

const COLLECTION_NAME = 'rewards';

export const RewardService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Reward>()),

    getByAccountId: async (accountId: string): Promise<Reward[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<Reward>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    get: async (id: string): Promise<Reward | undefined> => {
        const ref = doc(db, COLLECTION_NAME, id).withConverter(converter<Reward>());
        const snapshot = await getDoc(ref);
        return snapshot.data();
    },

    add: async (reward: Reward) => {
        const ref = doc(db, COLLECTION_NAME, reward.id).withConverter(converter<Reward>());
        await setDoc(ref, reward);
    },

    update: async (id: string, updates: Partial<Reward>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, removeUndefined(updates));
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    }
}
