import { useMemo } from 'react';
import { Reward } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "../store/useSessionStore";
import { RewardService } from "@/lib/firestore/rewards.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useRewards() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Source of truth for accountId
    const accountId = user?.uid || activeProfile?.accountId;

    // Create Firestore Query
    const rewardsQuery = useMemo(() => {
        if (!accountId) return null;
        return query(
            RewardService.getCollection(),
            where("accountId", "==", accountId)
            // orderBy("createdAt", "desc") // Let's try relying on manual sort if index missing
        );
    }, [accountId]);

    const { data: rewards, loading, error } = useFirestoreQuery<Reward>(rewardsQuery);

    // Sort in JS to be safe (and avoid requiring composite index immediately)
    const sortedRewards = useMemo(() => {
        return rewards?.slice().sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Newest first
        });
    }, [rewards]);

    const addReward = async (title: string, cost: number, icon: string, requiresApproval: boolean = true, assignedProfileIds?: string[]) => {
        if (!accountId) throw new Error("No active account");

        const newReward: Reward = {
            id: uuidv4(),
            accountId: accountId,
            title,
            cost,
            icon,
            isActive: true,
            requiresApproval,
            assignedProfileIds,
            createdAt: new Date(),
        };

        await RewardService.add(newReward);
    };

    const updateReward = async (id: string, updates: Partial<Reward>) => {
        await RewardService.update(id, updates);
    };

    const deleteReward = async (id: string) => {
        await RewardService.delete(id);
    };

    return {
        rewards: sortedRewards,
        loading,
        error,
        addReward,
        updateReward,
        deleteReward
    };
}
