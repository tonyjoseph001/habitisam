import { useMemo } from 'react';
import { InboxReward } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "@/lib/store/useSessionStore"; // Added import
import { InboxService } from "@/lib/firestore/inbox.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useInbox(profileId?: string) {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore(); // Get active profile

    // Resolve Correct Account ID (Household ID)
    // For Secondary Parents (or Children of Secondary Parents), we MUST use the Profile's accountId.
    // Falling back to user.uid only works for the Primary Owner.
    const accountId = activeProfile?.accountId || user?.uid;

    // Create Firestore Query
    const inboxQuery = useMemo(() => {
        if (!accountId) return null;

        let q = query(
            InboxService.getCollection(),
            where("accountId", "==", accountId)
        );

        if (profileId) {
            q = query(q, where("profileId", "==", profileId));
        }

        return q;
    }, [accountId, profileId]); // Dep changed to accountId

    const { data: inboxItems, loading, error } = useFirestoreQuery<InboxReward>(inboxQuery);

    const addInboxItem = async (item: Omit<InboxReward, 'id' | 'accountId' | 'createdAt'>) => {
        if (!accountId) throw new Error("No active account linked");

        const newItem: InboxReward = {
            id: uuidv4(),
            accountId: accountId,
            ...item,
            createdAt: new Date(),
        };

        await InboxService.add(newItem);
        return newItem.id;
    };

    const updateInboxItem = async (id: string, updates: Partial<InboxReward>) => {
        await InboxService.update(id, updates);
    };

    const deleteInboxItem = async (id: string) => {
        await InboxService.delete(id);
    };

    const claimInboxItem = async (item: InboxReward) => {
        await InboxService.claim(item);
    };

    return {
        inboxItems: inboxItems || [],
        loading,
        error,
        addInboxItem,
        updateInboxItem,
        deleteInboxItem,
        claimInboxItem
    };
}
