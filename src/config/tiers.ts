export const TIER_LIMITS = {
    free: {
        maxChildren: 2,
        maxTotalRoutines: 4, // Household Total
        maxTotalGoals: 2, // Household Total Active
        canCustomizeRewards: false,
        canAccessAnalytics: false,
        allowedThemes: ['default'], // Light mode only
        allowedAvatars: ['boy', 'girl'], // Basic only
        showAds: true,
        label: "Starter"
    },
    pro: {
        maxChildren: 5,
        maxTotalRoutines: 100,
        maxTotalGoals: 100,
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
