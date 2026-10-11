/**
 * Registers the Service Worker to enable offline caching of deals and core data.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Avoid registering service worker in unit test environments
  if (navigator.userAgent.includes('jsdom') || navigator.userAgent.includes('Vitest')) {
    return;
  }

  window.addEventListener('load', () => {
    // Relative path support for GitHub Pages subpath deployment or root deployment
    const base = import.meta.env.BASE_URL || '/';
    const swUrl = `${base.replace(/\/$/, '')}/sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // SW registered
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
              }
            };
          }
        };
      })
      .catch((err) => {
        // Silently catch registration errors in dev/unsupported contexts
        console.warn('[SW] Service worker registration error:', err?.message || err);
      });
  });
}
