import { useLiveQuery } from "dexie-react-hooks";
import { db, Activity, Step } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "@/lib/store/useSessionStore";

export function useRoutines() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Query all activities for the household (account)
    // We use user.uid as the source of truth for the accountId if available,
    // falling back to activeProfile if for some reason user is missing but profile exists (rare).
    const accountId = user?.uid || activeProfile?.accountId;

    const routines = useLiveQuery(
        async () => {
            if (!accountId) return [];
            return await db.activities
                .where("accountId")
                .equals(accountId)
                .reverse()
                .sortBy("createdAt");
        },
        [accountId]
    );

    const addRoutine = async (
        title: string,
        type: Activity['type'],
        timeOfDay: string,
        steps: Step[],
        profileIds: string[] = []
    ) => {
        if (!accountId) throw new Error("No active account");

        const newActivity: Activity = {
            id: uuidv4(),
            accountId: accountId,
            profileIds: profileIds,
            type,
            title,
            timeOfDay,
            steps,
            isActive: true,
            createdAt: new Date(),
        };

        // @ts-ignore
        await db.activities.add(newActivity);
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
