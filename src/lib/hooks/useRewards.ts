import { useLiveQuery } from "dexie-react-hooks";
import { db, Reward } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useSessionStore } from "../store/useSessionStore";

export function useRewards() {
    const { activeProfile } = useSessionStore();

    const rewards = useLiveQuery(
        async () => {
            if (!activeProfile?.accountId) return [];
            return await db.rewards
                .where("accountId")
                .equals(activeProfile.accountId)
                .reverse()
                .toArray(); // Sort handled manually if needed, but reverse gives newest first usually if ID is time-based? No UUID.
            // Actually UUIDs aren't time sorted. We should probably sort by a createdAt if we added it, or trust insertion order?
            // The schema has `createdAt?: Date`.
        },
        [activeProfile?.accountId]
    );

    // Sort in JS to be safe
    const sortedRewards = rewards?.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Newest first
    });

    const addReward = async (title: string, cost: number, icon: string) => {
        if (!activeProfile?.accountId) throw new Error("No active account");

        const newReward: Reward = {
            id: uuidv4(),
            accountId: activeProfile.accountId,
            title,
            cost,
            icon,
            isActive: true,
            createdAt: new Date(),
        };

        await db.rewards.add(newReward as any);
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
