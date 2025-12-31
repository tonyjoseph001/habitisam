import { useMemo } from 'react';
import { ActivityLog } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { LogService } from "@/lib/firestore/logs.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy, limit } from 'firebase/firestore';

export function useActivityLogs(profileId?: string, date?: string) {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Create Firestore Query
    const logsQuery = useMemo(() => {
        const targetAccountId = activeProfile?.accountId || user?.uid;
        if (!targetAccountId) return null;

        // Base query by Account
        let q = query(
            LogService.getCollection(),
            where("accountId", "==", targetAccountId)
        );

        // Optional filters
        // NOTE: Firestore requires composite indexes for multiple equality/inequality checks
        // For now, we fetch by Account (and maybe Profile) and Filter in Client if needed for complex combinations
        // OR we trust that we'll add indexes later.

        if (profileId) {
            q = query(q, where("profileId", "==", profileId));
        }

        if (date) {
            q = query(q, where("date", "==", date));
        }

        // Limit results to avoid fetching thousands of logs
        // q = query(q, limit(100)); 

        return q;
    }, [user?.uid, profileId, date]);

    const { data: logs, loading, error } = useFirestoreQuery<ActivityLog>(logsQuery);

    const addLog = async (log: Omit<ActivityLog, 'id' | 'accountId'>) => {
        if (!user?.uid) throw new Error("No authenticated user");

        const newLog: ActivityLog = {
            id: uuidv4(),
            accountId: user.uid,
            ...log
        };

        await LogService.add(newLog);
        return newLog.id;
    };

    // No update/delete usually for logs, but exposed just in case
    const deleteLog = async (id: string) => {
        await LogService.delete(id);
    };

    return {
        logs: logs || [],
        loading,
        error,
        addLog,
        deleteLog
    };
}
