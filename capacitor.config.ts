import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigdatabytes.habitisam',
  appName: 'Habitisam',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
