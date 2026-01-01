import { db } from './core';
import { converter, removeUndefined } from './converters';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Profile } from '@/lib/db'; // Keep using shared Types from db.ts for now

const COLLECTION_NAME = 'profiles';

export const ProfileService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Profile>()),

    /**
     * Get a single profile by ID
     */
    get: async (id: string): Promise<Profile | null> => {
        const ref = doc(db, COLLECTION_NAME, id).withConverter(converter<Profile>());
        const snap = await import('firebase/firestore').then(m => m.getDoc(ref));
        return snap.exists() ? snap.data() : null;
    },

    /**
     * Get all profiles for a specific master account (Parent UID)
     */
    getByAccountId: async (accountId: string): Promise<Profile[]> => {
        const q = query(
            collection(db, COLLECTION_NAME).withConverter(converter<Profile>()),
            where('accountId', '==', accountId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    },

    /**
     * Create or Overwrite a profile
     */
    add: async (profile: Profile) => {
        const ref = doc(db, COLLECTION_NAME, profile.id).withConverter(converter<Profile>());
        await setDoc(ref, {
            ...profile,
            // Ensure dates are converted to strings/timestamps if needed by Firestore (Firestore handles Dates okay, but usually Timestamps)
        });
    },

    /**
     * Update partial fields
     */
    update: async (id: string, updates: Partial<Profile>) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, removeUndefined(updates));
    },

    /**
     * Delete profile
     */
    delete: async (id: string) => {
        const ref = doc(db, COLLECTION_NAME, id);
        await deleteDoc(ref);
    }
}
