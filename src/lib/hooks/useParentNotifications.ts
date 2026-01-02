import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firestore/core';
import { useAuth } from '@/lib/hooks/useAuth';

export function useParentNotifications() {
    const { user } = useAuth();
    const [pendingGoalsCount, setPendingGoalsCount] = useState(0);
    const [pendingPurchasesCount, setPendingPurchasesCount] = useState(0);

    const accountId = user?.uid;

    useEffect(() => {
        if (!accountId) return;

        // 1. Pending Goals Listener
        const goalsQuery = query(
            collection(db, 'goals'),
            where('accountId', '==', accountId),
            where('status', '==', 'pending_approval')
        );

        const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
            setPendingGoalsCount(snapshot.size);
        });

        // 2. Pending Purchases Listener
        const purchasesQuery = query(
            collection(db, 'purchaseLogs'),
            where('accountId', '==', accountId),
            where('status', '==', 'pending')
        );

        const unsubPurchases = onSnapshot(purchasesQuery, (snapshot) => {
            setPendingPurchasesCount(snapshot.size);
        });

        return () => {
            unsubGoals();
            unsubPurchases();
        };
    }, [accountId]);

    return {
        count: pendingGoalsCount + pendingPurchasesCount,
        breakdown: {
            goals: pendingGoalsCount,
            purchases: pendingPurchasesCount
        }
    };
}
