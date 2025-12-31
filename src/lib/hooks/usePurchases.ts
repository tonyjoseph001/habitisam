import { useMemo } from 'react';
import { PurchaseLog } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { PurchaseService } from "@/lib/firestore/purchases.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function usePurchases(profileId?: string, status?: PurchaseLog['status']) {
    const { user } = useAuth();

    // Create Firestore Query
    const purchasesQuery = useMemo(() => {
        if (!user?.uid) return null;

        let q = query(
            PurchaseService.getCollection(),
            where("accountId", "==", user.uid)
        );

        if (profileId) {
            q = query(q, where("profileId", "==", profileId));
        }

        if (status) {
            q = query(q, where("status", "==", status));
        }

        return q;
    }, [user?.uid, profileId, status]);

    const { data: purchases, loading, error } = useFirestoreQuery<PurchaseLog>(purchasesQuery);

    const addPurchase = async (log: Omit<PurchaseLog, 'id' | 'accountId'>) => {
        if (!user?.uid) throw new Error("No authenticated user");

        const newLog: PurchaseLog = {
            id: uuidv4(),
            accountId: user.uid,
            ...log
        };

        await PurchaseService.add(newLog);
        return newLog.id;
    };

    const updatePurchase = async (id: string, updates: Partial<PurchaseLog>) => {
        await PurchaseService.update(id, updates);
    };

    const deletePurchase = async (id: string) => {
        await PurchaseService.delete(id);
    };

    const approvePurchase = async (log: PurchaseLog) => {
        await PurchaseService.approve(log);
    };

    const rejectPurchase = async (log: PurchaseLog) => {
        await PurchaseService.reject(log);
    };

    const claimInstant = async (log: PurchaseLog) => {
        await PurchaseService.claimInstant(log);
    };

    return {
        purchases: purchases || [],
        loading,
        error,
        addPurchase,
        updatePurchase,
        deletePurchase,
        approvePurchase,
        rejectPurchase,
        claimInstant
    };
}
