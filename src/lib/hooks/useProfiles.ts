import { useMemo } from 'react';
import { Profile } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/lib/hooks/useAuth";
import { ProfileService } from "@/lib/firestore/profiles.service";
import { useFirestoreQuery } from "@/lib/firestore/hooks";
import { query, where, orderBy } from 'firebase/firestore';

export function useProfiles() {
    const { user } = useAuth();

    // Create Firestore Query
    const profilesQuery = useMemo(() => {
        if (!user?.uid) return null;
        return query(
            ProfileService.getCollection(),
            where("accountId", "==", user.uid)
            // orderBy("createdAt", "asc") // Optional
        );
    }, [user?.uid]);

    const { data: profiles, loading, error } = useFirestoreQuery<Profile>(profilesQuery);

    const addProfile = async (
        name: string,
        type: Profile['type'],
        avatarId: string,
        pin?: string,
        theme: Profile['theme'] = 'default'
    ) => {
        if (!user?.uid) throw new Error("No authenticated user");

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: user.uid,
            name,
            type,
            avatarId,
            pin,
            theme,
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
