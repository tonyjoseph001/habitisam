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
}

const CACHE_KEY = 'system_config_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour

export const SystemService = {
    getConfig: async (): Promise<RemoteSystemConfig | null> => {
        try {
            // 1. Check Local Cache first (to save reads)
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data as RemoteSystemConfig;
                }
            }

            // 2. Fetch from Firestore (Collection: 'system', Doc: 'config')
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
            }

            return null;
        } catch (error) {
            console.error("Failed to fetch system config:", error);
            return null; // Fail gracefully (app uses defaults)
        }
    }
};
