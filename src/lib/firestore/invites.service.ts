import { db } from './core';
import { converter } from './converters';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';

export interface Invite {
    code: string; // 6-digit code
    accountId: string; // The household ID to join
    inviterName: string; // "Tony"
    createdAt: Date;
    expiresAt: Date; // 24 hours
}

const COLLECTION_NAME = 'invites';

export const InviteService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Invite>()),

    create: async (accountId: string, inviterName: string): Promise<string> => {
        // Generate random 6-char code (uppercase alphanumeric)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 similar chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const invite: Invite = {
            code,
            accountId,
            inviterName,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        const ref = doc(db, COLLECTION_NAME, code).withConverter(converter<Invite>());
        await setDoc(ref, invite);

        return code;
    },

    validate: async (code: string): Promise<Invite | null> => {
        const trimmedCode = code.trim().toUpperCase();
        console.log(`[InviteService] Validating code: '${trimmedCode}'`);
        const ref = doc(db, COLLECTION_NAME, trimmedCode).withConverter(converter<Invite>());
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn(`[InviteService] Code not found: '${trimmedCode}'`);
            return null;
        }

        const rawData = snap.data();

        // Convert Timestamps to Dates
        const data: Invite = {
            ...rawData,
            createdAt: rawData.createdAt instanceof Timestamp ? rawData.createdAt.toDate() : new Date(rawData.createdAt),
            expiresAt: rawData.expiresAt instanceof Timestamp ? rawData.expiresAt.toDate() : new Date(rawData.expiresAt)
        };

        if (new Date() > data.expiresAt) {
            console.warn(`[InviteService] Code expired. Expires: ${data.expiresAt}, Now: ${new Date()}`);
            // Cleanup expired
            await deleteDoc(ref);
            return null;
        }

        console.log(`[InviteService] Valid code!`);
        return data;
    },

    redeem: async (code: string): Promise<Invite | null> => {
        const invite = await InviteService.validate(code);
        if (invite) {
            // Delete used invite? Or keep for record? Delete for security/single-use?
            // Let's keep it single-use for now to prevent leaking
            const ref = doc(db, COLLECTION_NAME, code.toUpperCase());
            await deleteDoc(ref);
            return invite;
        }
        return null;
    }
};
