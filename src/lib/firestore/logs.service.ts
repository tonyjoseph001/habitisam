import { db } from './core';
import { converter } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { ActivityLog } from '@/lib/db';

const COLLECTION_NAME = 'activityLogs';

export const LogService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<ActivityLog>()),

    /**
     * Get logs for a specific account (Household)
     */
    getByAccountId: async (accountId: string): Promise<ActivityLog[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<ActivityLog>()),
            where('accountId', '==', accountId)
            // Note: Compound queries might need index creation in console
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    /**
     * Get logs for a specific child + date
     */
    getByProfileAndDate: async (accountId: string, profileId: string, date: string): Promise<ActivityLog[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<ActivityLog>()),
            where('accountId', '==', accountId),
            where('profileId', '==', profileId),
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    /**
     * Get all logs for a specific profile (for Streak calculation)
     */
    getByProfileId: async (profileId: string): Promise<ActivityLog[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<ActivityLog>()),
            where('profileId', '==', profileId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    add: async (log: ActivityLog) => {
        const ref = doc(db, COLLECTION_NAME, log.id).withConverter(converter<ActivityLog>());
        await setDoc(ref, log);
    },

    update: async (id: string, updates: Partial<ActivityLog>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, updates);
    },

    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    }
}
