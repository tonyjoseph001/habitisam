import { useLiveQuery } from "dexie-react-hooks";
import { db, Activity, Step } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useSessionStore } from "../store/useSessionStore";

export function useRoutines() {
    const { activeProfile } = useSessionStore();

    // Query all activities for the household (account)
    // In a real app, we might filter by the active profile's assignment, 
    // but for the admin view, we want to see ALL routines to manage them.
    const routines = useLiveQuery(
        async () => {
            if (!activeProfile?.accountId) return [];
            return await db.activities
                .where("accountId")
                .equals(activeProfile.accountId)
                .reverse()
                .sortBy("createdAt");
        },
        [activeProfile?.accountId]
    );

    const addRoutine = async (
        title: string,
        type: Activity['type'],
        timeOfDay: string,
        steps: Step[],
        profileIds: string[] = []
    ) => {
        if (!activeProfile?.accountId) throw new Error("No active account");

        const newActivity: Activity = {
            id: uuidv4(),
            accountId: activeProfile.accountId,
            profileIds: profileIds, // Default to none or passed list
            type,
            title,
            timeOfDay,
            steps,
            isActive: true,
            createdAt: new Date(),
        };

        await db.activities.add(newActivity as any);
        return newActivity.id;
    };

    const updateRoutine = async (id: string, updates: Partial<Activity>) => {
        await db.activities.update(id, updates);
    };

    const deleteRoutine = async (id: string) => {
        await db.activities.delete(id);
    };

    return {
        routines,
        addRoutine,
        updateRoutine,
        deleteRoutine
    };
}
