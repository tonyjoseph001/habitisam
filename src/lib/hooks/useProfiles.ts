import { useMemo } from 'react';
import { Profile } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAccount } from "@/lib/hooks/useAccount";
import { useAuth } from "@/lib/hooks/useAuth";
import { ProfileService } from "@/lib/firestore/profiles.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useProfiles() {
    const { user } = useAuth();
    const { account } = useAccount();

    // Use the resolved account ID (Shared Household or Personal)
    const accountId = account?.uid || user?.uid;

    // Create Firestore Query
    const profilesQuery = useMemo(() => {
        if (!accountId) return null;
        return query(
            ProfileService.getCollection(),
            where("accountId", "==", accountId)
            // orderBy("createdAt", "asc") // Optional
        );
    }, [accountId]);

    const { data: profiles, loading, error } = useFirestoreQuery<Profile>(profilesQuery);

    const addProfile = async (
        name: string,
        type: Profile['type'],
        avatarId: string,
        pin?: string,
        theme: Profile['theme'] = 'default',
        dob?: string
    ) => {
        if (!user?.uid) throw new Error("No authenticated user");
        if (!accountId) throw new Error("No active account linked");

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: accountId, // Use the resolved account ID
            name,
            type,
            avatarId,
            pin,
            theme,
            dob,
            createdAt: new Date(),
        };

        if (type === 'child') {
            newProfile.stars = 0;
            newProfile.xp = 0;
            newProfile.activeStamp = 'star';
            newProfile.unlockedStamps = ['star'];
        }

        await ProfileService.add(newProfile);
        return newProfile.id;
    };

    const updateProfile = async (id: string, updates: Partial<Profile>) => {
        await ProfileService.update(id, updates);
    };

    const deleteProfile = async (id: string) => {
        await ProfileService.delete(id);
    };

    return {
        profiles: profiles || [],
        loading,
        error,
        addProfile,
        updateProfile,
        deleteProfile
    };
}
