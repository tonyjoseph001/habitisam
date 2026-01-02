export const APP_CONFIG = {
    // Current App Version (Semantic Versioning: Major.Minor.Patch)
    version: '1.0.0',
    buildNumber: 1,

    // Store URLs for Redirect
    paddingStoreUrl: 'https://play.google.com/store/apps/details?id=com.antigravity.habitisim', // TODO: Update
    appStoreUrl: 'https://apps.apple.com/app/id123456789', // TODO: Update

    // Feature Flags (Default Local Fallbacks)
    defaultFeatureFlags: {
        enableAds: false,
        enableProExclusivity: false, // If false, everyone gets Pro features (Launch Phase)
        maintenanceMode: false
    }
};
