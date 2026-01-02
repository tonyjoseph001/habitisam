import { useMemo } from 'react';
import { Goal } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { GoalService } from "@/lib/firestore/goals.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

import { useAccount } from "@/lib/hooks/useAccount";

export function useGoals(profileId?: string) {
    const { user } = useAuth();
    const { account } = useAccount();

    const accountId = account?.uid || user?.uid;

    // Create Firestore Query
    const goalsQuery = useMemo(() => {
        if (!accountId) return null;

        let q = query(
            GoalService.getCollection(),
            where("accountId", "==", accountId)
        );

        if (profileId) {
            q = query(q, where("profileId", "==", profileId));
        }

        // Note: multiple where clauses + orderBy might require index
        // avoiding orderBy for now or relying on memory sort if list is small
        return q;
    }, [accountId, profileId]);

    const { data: goals, loading, error } = useFirestoreQuery<Goal>(goalsQuery);

    const addGoal = async (goal: Omit<Goal, 'id' | 'accountId' | 'createdAt' | 'current' | 'completedAt'>) => {
        if (!user?.uid) throw new Error("No authenticated user");
        if (!accountId) throw new Error("No active account");

        const newGoal: Goal = {
            id: uuidv4(),
            accountId: accountId,
            ...goal,
            current: 0,
            createdAt: new Date(),
        };

        await GoalService.add(newGoal);
        return newGoal.id;
    };

    const updateGoal = async (id: string, updates: Partial<Goal>) => {
        await GoalService.update(id, updates);
    };

    const deleteGoal = async (id: string) => {
        await GoalService.delete(id);
    };

    return {
        goals: goals || [],
        loading,
        error,
        addGoal,
        updateGoal,
        deleteGoal
    };
}
