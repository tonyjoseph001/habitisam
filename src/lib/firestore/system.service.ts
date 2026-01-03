import { db } from '@/lib/firestore/core';
import { doc, getDoc } from 'firebase/firestore';

export interface RemoteSystemConfig {
    minSupportedVersion: string; // e.g. "1.0.0" (Force Update)
    latestVersion: string;       // e.g. "1.1.0" (Soft Update)
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    featureFlags: {
        enableAds: boolean;
        enableProExclusivity: boolean;
        [key: string]: boolean;
    };
    adMob?: {
        androidBannerId?: string;
        iosBannerId?: string;
    };
}

const CACHE_KEY = 'system_config_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 Hours

export const SystemService = {
    getConfig: async (): Promise<RemoteSystemConfig | null> => {
        // Helper to get cache
        const getLocalCache = (): RemoteSystemConfig | null => {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        return data as RemoteSystemConfig;
                    }
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
            return null;
        };

        try {
            // 1. Network First (Force Sync)
            // We always try to fetch fresh config to ensure Ads/Features are up to date.
            const ref = doc(db, 'system', 'config');
            const snap = await getDoc(ref);

            if (snap.exists()) {
                const data = snap.data() as RemoteSystemConfig;

                // Update Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                return data;
            } else {
                // If doc doesn't exist, try falling back to cache? 
                // Usually if DB is reachable but doc missing, we should probably return null or defaults.
                // But let's check cache just in case of weird permissions.
                return getLocalCache();
            }

        } catch (error) {
            console.warn("Failed to fetch remote config (Network/Offline). Falling back to cache.", error);
            // 2. Offline Fallback
            return getLocalCache();
        }
    }
};
