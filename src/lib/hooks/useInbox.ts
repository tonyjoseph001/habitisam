import { useMemo } from 'react';
import { InboxReward } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { InboxService } from "@/lib/firestore/inbox.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useInbox(profileId?: string) {
    const { user } = useAuth();

    // Create Firestore Query
    const inboxQuery = useMemo(() => {
        if (!user?.uid) return null;

        let q = query(
            InboxService.getCollection(),
            where("accountId", "==", user.uid)
        );

        if (profileId) {
            q = query(q, where("profileId", "==", profileId));
        }

        return q;
    }, [user?.uid, profileId]);

    const { data: inboxItems, loading, error } = useFirestoreQuery<InboxReward>(inboxQuery);

    const addInboxItem = async (item: Omit<InboxReward, 'id' | 'accountId' | 'createdAt'>) => {
        if (!user?.uid) throw new Error("No authenticated user");

        const newItem: InboxReward = {
            id: uuidv4(),
            accountId: user.uid,
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
