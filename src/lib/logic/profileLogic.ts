
import { db } from '@/lib/db';

export async function deleteProfileCascading(profileId: string) {
    if (!profileId) return;

    await db.transaction('rw', [db.profiles, db.purchaseLogs, db.activityLogs, db.goals, db.activities, db.rewards], async () => {
        // 1. Delete the Profile itself
        await db.profiles.delete(profileId);

        // 2. Delete related LOGS (History) - Or should we keep them? 
        // User request: "delete all the related data... like approval requests".
        // It's safer to delete everything to avoid ghost data.
        await db.purchaseLogs.where('profileId').equals(profileId).delete();
        await db.activityLogs.where('profileId').equals(profileId).delete();

        // 3. Delete Goals (Quests)
        await db.goals.where('profileId').equals(profileId).delete();

        // 4. Unassign from Shared Activities (Routines)
        // Find activities where this profile is assigned
        const activities = await db.activities.filter(a => a.profileIds.includes(profileId)).toArray();
        for (const activity of activities) {
            const newProfileIds = activity.profileIds.filter(id => id !== profileId);
            if (newProfileIds.length === 0) {
                // If no one else is assigned, do we delete the routine? 
                // Maybe, but safer to just leave it unassigned or let user delete. 
                // Let's just update for now.
                await db.activities.update(activity.id, { profileIds: [] });
            } else {
                await db.activities.update(activity.id, { profileIds: newProfileIds });
            }
        }

        // 5. Unassign from Rewards
        const rewards = await db.rewards.filter(r => r.assignedProfileIds?.includes(profileId) || false).toArray();
        for (const reward of rewards) {
            const newAssignedIds = reward.assignedProfileIds?.filter(id => id !== profileId) || [];
            await db.rewards.update(reward.id, { assignedProfileIds: newAssignedIds });
        }
    });
}
