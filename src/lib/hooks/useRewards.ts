import { useLiveQuery } from "dexie-react-hooks";
import { db, Reward } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "../store/useSessionStore";

export function useRewards() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Source of truth for accountId
    const accountId = user?.uid || activeProfile?.accountId;

    const rewards = useLiveQuery(
        async () => {
            if (!accountId) return [];
            return await db.rewards
                .where("accountId")
                .equals(accountId)
                .reverse()
                .toArray();
        },
        [accountId]
    );

    // Sort in JS to be safe
    const sortedRewards = rewards?.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Newest first
    });

    const addReward = async (title: string, cost: number, icon: string) => {
        if (!accountId) throw new Error("No active account");

        const newReward: Reward = {
            id: uuidv4(),
            accountId: accountId,
            title,
            cost,
            icon,
            isActive: true,
            createdAt: new Date(),
        };

        // @ts-ignore
        await db.rewards.add(newReward);
    };

    const updateReward = async (id: string, updates: Partial<Reward>) => {
        await db.rewards.update(id, updates);
    };

    const deleteReward = async (id: string) => {
        await db.rewards.delete(id);
    };

    return {
        rewards: sortedRewards,
        addReward,
        updateReward,
        deleteReward
    };
}
