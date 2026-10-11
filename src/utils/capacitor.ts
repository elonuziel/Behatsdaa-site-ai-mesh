import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initializes native Capacitor app plugins on application launch.
 * Sets native Status Bar style & background color, and cleanly hides the native Splash Screen.
 */
export async function initCapacitorApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Configure status bar style
    await StatusBar.setStyle({ style: Style.Dark });

    // Set status bar background color on Android if supported
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0F172A' });
    }
  } catch (err) {
    console.warn('Status bar initialization failed:', err);
  }

  try {
    // Hide splash screen after webview and resources are ready
    await SplashScreen.hide();
  } catch (err) {
    console.warn('Splash screen hide failed:', err);
  }
}
