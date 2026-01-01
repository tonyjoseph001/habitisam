import { useMemo } from 'react';
import { Activity, Step } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { ActivityService } from "@/lib/firestore/activities.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useRoutines() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Query all activities for the household (account)
    const accountId = user?.uid || activeProfile?.accountId;

    // Create Firestore Query
    const routinesQuery = useMemo(() => {
        if (!accountId) return null;
        return query(
            ActivityService.getCollection(),
            where("accountId", "==", accountId),
            orderBy("createdAt", "desc") // Sort by created desc
        );
    }, [accountId]);

    const { data: routines, loading, error } = useFirestoreQuery<Activity>(routinesQuery);

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

        await ActivityService.add(newActivity);
        return newActivity.id;
    };

    const updateRoutine = async (id: string, updates: Partial<Activity>) => {
        await ActivityService.update(id, updates);
    };

    const deleteRoutine = async (id: string) => {
        await ActivityService.delete(id);
    };

    return {
        routines: routines || [],
        loading,
        error,
        addRoutine,
        updateRoutine,
        deleteRoutine
    };
}
