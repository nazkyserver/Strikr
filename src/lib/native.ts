import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export const isNativeApp = Capacitor.isNativePlatform();

export async function prepareNativeUi() {
  if (!isNativeApp) return;
  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
  } catch {
    // The system bars keep their platform default.
  }
}

export async function hideSplashScreen() {
  if (!isNativeApp) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // The splash screen auto-hides on its own.
  }
}

export async function keepScreenAwake(): Promise<(() => void) | null> {
  if (!isNativeApp) return null;
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    const { isSupported } = await KeepAwake.isSupported();
    if (!isSupported) return null;
    await KeepAwake.keepAwake();
    return () => {
      void KeepAwake.allowSleep().catch(() => undefined);
    };
  } catch {
    return null;
  }
}
