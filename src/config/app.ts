export const APP_CONFIG = {
    // Current App Version (Semantic Versioning: Major.Minor.Patch)
    version: '1.0.0',
    buildNumber: 1,

    // Store URLs for Redirect
    paddingStoreUrl: 'https://play.google.com/store/apps/details?id=com.antigravity.habitisim', // TODO: Update
    appStoreUrl: 'https://apps.apple.com/app/id123456789', // TODO: Update

    // Feature Flags (Default Local Fallbacks)
    defaultFeatureFlags: {
        enableAds: true,
        enableProExclusivity: false, // If false, everyone gets Pro features (Launch Phase)
        maintenanceMode: false
    },

    // AdMob Configuration (Using Google Test IDs)
    adMob: {
        androidBannerId: 'ca-app-pub-3940256099942544/6300978111',
        iosBannerId: 'ca-app-pub-3940256099942544/2934735716'
    }
};
