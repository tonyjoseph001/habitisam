import { db } from './core';
import { converter, removeUndefined } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Activity } from '@/lib/db';

const COLLECTION_NAME = 'activities';

export const ActivityService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Activity>()),

    getByAccountId: async (accountId: string): Promise<Activity[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<Activity>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    get: async (id: string): Promise<Activity | null> => {
        const ref = doc(db, COLLECTION_NAME, id).withConverter(converter<Activity>());
        const snap = await import('firebase/firestore').then(m => m.getDoc(ref));
        return snap.exists() ? snap.data() : null;
    },

    add: async (activity: Activity) => {
        const ref = doc(db, COLLECTION_NAME, activity.id).withConverter(converter<Activity>());
        await setDoc(ref, activity);
    },

    update: async (id: string, updates: Partial<Activity>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, removeUndefined(updates));
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    }
}
