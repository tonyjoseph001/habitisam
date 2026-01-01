import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigdatabytes.habitisam',
  appName: 'Habitisam',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK', // Light text/icons on dark background
      backgroundColor: '#1e293b', // Dark slate to match theme
      overlaysWebView: false // Push content down, don't overlay
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    }
  }
};

export default config;
