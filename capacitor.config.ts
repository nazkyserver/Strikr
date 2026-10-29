import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.strikr.app',
  appName: 'Strikr',
  webDir: 'dist',
  backgroundColor: '#090a09',
  android: {
    backgroundColor: '#090a09',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    zoomEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      launchAutoHide: true,
      backgroundColor: '#090a09',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
      hidden: false,
    },
  },
};

export default config;
