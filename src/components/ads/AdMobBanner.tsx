import { useEffect, useState } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, BannerAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { APP_CONFIG } from '@/config/app';
import { useAccount } from '@/lib/hooks/useAccount';
import { SystemService } from '@/lib/firestore/system.service';
import { toast } from 'sonner';

interface AdMobBannerProps {
    position?: BannerAdPosition;
    margin?: number;
    size?: BannerAdSize;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: any) => void;
}

export function AdMobBanner({ position = BannerAdPosition.BOTTOM_CENTER, margin = 100, size = BannerAdSize.ADAPTIVE_BANNER, ...props }: AdMobBannerProps) {
    const { isPro, loading: accountLoading } = useAccount();
    const [adLoaded, setAdLoaded] = useState(false);
    const [adsEnabled, setAdsEnabled] = useState(false);
    const [remoteConfig, setRemoteConfig] = useState<any>(null);
    const [configLoading, setConfigLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            console.log("🔍 AdMobBanner: Fetching config...");
            const config = await SystemService.getConfig();
            console.log("🔍 AdMobBanner: Config received:", config);

            const remoteEnabled = config?.featureFlags?.enableAds;
            console.log("🔍 AdMobBanner: remoteEnabled =", remoteEnabled);

            // Fallback to local default if remote is undefined
            const finalValue = remoteEnabled ?? APP_CONFIG.defaultFeatureFlags.enableAds;
            console.log("🔍 AdMobBanner: Final adsEnabled =", finalValue);

            // DEBUG TOAST
            if (finalValue) {
                // toast.success("✅ Config: ADS ENABLED");
            } else {
                // toast.error("❌ Config: ADS DISABLED");
            }

            setAdsEnabled(finalValue);
            setRemoteConfig(config);
            setConfigLoading(false);
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        // 1. Wait for everything to load
        if (accountLoading || configLoading) return;

        // 2. Check if we should show ads
        // Must be enabled in config AND user must NOT be Pro
        if (!adsEnabled || isPro) {
            // Ensure ads are hidden if they were previously shown
            if (adLoaded) {
                AdMob.removeBanner().catch(() => { });
                setAdLoaded(false);
            }
            return;
        }

        // 3. Native Only check
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        // 4. Initialize and Show
        const initAds = async () => {
            try {
                // Ensure previous banner is cleared before showing new one (important for switching sizes)
                if (adLoaded) {
                    await AdMob.removeBanner().catch(() => { });
                }

                await AdMob.initialize();

                const options: BannerAdOptions = {
                    adId: Capacitor.getPlatform() === 'ios'
                        ? (remoteConfig?.adMob?.iosBannerId || APP_CONFIG.adMob.iosBannerId)
                        : (remoteConfig?.adMob?.androidBannerId || APP_CONFIG.adMob.androidBannerId),
                    adSize: size,
                    position: position,
                    margin: margin,
                    isTesting: true // Always true for dev
                };
                console.log("🔍 AdMobBanner: Using AdUnitID:", options.adId);

                await AdMob.removeBanner();
                await AdMob.showBanner(options);
                setAdLoaded(true);
                if (props.onAdLoaded) props.onAdLoaded();
            } catch (e: any) {
                console.error("❌ AdMob Load Error:", e);
                // toast.error("❌ Ad Load Failed: " + (e.message || JSON.stringify(e)));
                if (props.onAdFailedToLoad) props.onAdFailedToLoad(e);
            }
        };

        initAds();


        return () => {
            // Cleanup handled by route changes vs mounting. 
            AdMob.removeBanner().catch(() => { });
        };
    }, [isPro, accountLoading, adsEnabled, configLoading, position, margin, size]);

    const hideAd = async () => {
        try {
            await AdMob.removeBanner();
            setAdLoaded(false);
        } catch (e) {
            console.error(e);
        }
    };

    if (!adLoaded) return null;

    return null; // Native overlay
}
