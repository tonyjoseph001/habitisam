export const TIER_LIMITS = {
    free: {
        maxChildren: 2,
        maxRoutinesPerChild: 3,
        maxHabits: 5,
        canCustomizeRewards: false,
        canAccessAnalytics: false,
        allowedThemes: ['default'], // Light mode only
        allowedAvatars: ['boy', 'girl'], // Basic only
        showAds: true,
        label: "Starter"
    },
    pro: {
        maxChildren: 5,
        maxRoutinesPerChild: 50,
        maxHabits: 50,
        canCustomizeRewards: true,
        canAccessAnalytics: true,
        allowedThemes: ['default', 'ocean', 'sunset', 'forest', 'candy', 'midnight'], // All themes
        allowedAvatars: ['boy', 'girl', 'superhero', 'superhero_girl', 'ninja', 'wizard', 'princess', 'pirate', 'alien', 'robot', 'dinosaur', 'unicorn', 'dragon', 'rocket'], // All avatars
        showAds: false,
        label: "Pro"
    }
};

export type LicenseType = 'free' | 'pro' | 'enterprise';

export const getLimits = (licenseType: LicenseType = 'free') => {
    if (licenseType === 'enterprise') return TIER_LIMITS.pro; // Enterprise gets Pro limits for now
    return (licenseType === 'pro') ? TIER_LIMITS.pro : TIER_LIMITS.free;
};
