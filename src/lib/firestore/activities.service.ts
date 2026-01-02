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

        // Create Inbox Notifications for assigned children
        if (activity.profileIds && activity.profileIds.length > 0) {
            const batch = (await import('firebase/firestore')).writeBatch(db);
            const inboxCol = collection(db, 'inboxRewards');

            activity.profileIds.forEach(pid => {
                const newInboxRef = doc(inboxCol);
                batch.set(newInboxRef, {
                    id: newInboxRef.id,
                    accountId: activity.accountId,
                    profileId: pid,
                    amount: 0,
                    message: `New Mission: ${activity.title}`,
                    senderName: 'Parent',
                    status: 'pending',
                    createdAt: new Date()
                });
            });

            await batch.commit();
        }
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
