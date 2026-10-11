/**
/**
 * Service Worker (sw.js)
 * Provides offline support and resilient caching for core application datasets & saved deals.
 */

const CACHE_NAME_STATIC = 'behatsdaa-shell-v1';
const CACHE_NAME_DATA = 'behatsdaa-data-v1';

// Core essential static shell assets to precache on install
const PRECACHE_SHELL = [
  './',
  './index.html',
  './data/search-index.json',
  './data/deals.json',
  './data/stores.json',
  './data/billing_stores.json',
  './data/search_lexicon.json'
];

// Core data file patterns to handle with resilient caching
const DATA_URL_PATTERNS = [
  '/data/deals.json',
  '/data/stores.json',
  '/data/billing_stores.json',
  '/data/search-index.json',
  '/data/billing-index.json',
  '/data/search_lexicon.json',
  '/data/deals/',
  '/data/stores/',
  '/data/sources/',
  '/data/uniq/',
  '/data/mastercard/'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then(async (cache) => {
      // Precache critical shell files, ignoring individual missing ones so install never fails
      const promises = PRECACHE_SHELL.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch {
          // Ignore individual fetch errors during pre-cache
        }
      });
      await Promise.all(promises);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME_STATIC && key !== CACHE_NAME_DATA) {
            return caches.delete(key);
          }
          return null;
        })
      );
      await self.clients.claim();
    })
  );
});

/**
 * Helper to check if a URL is a data request
 */
function isDataRequest(url) {
  return url.endsWith('.json') || DATA_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * Fetch with network timeout for flaky / unstable connections
 */
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network request timed out'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip chrome-extension or other non-http(s) schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Core Data Strategy: Network-First with Fast Timeout + Resilient Cache Fallback
  if (isDataRequest(url.pathname)) {
    event.respondWith(
      (async () => {
        const dataCache = await caches.open(CACHE_NAME_DATA);

        try {
          // Attempt network with 2.5s timeout (protects against hanging/unstable connections)
          const networkResponse = await fetchWithTimeout(request, 2500);
          if (networkResponse && networkResponse.ok) {
            dataCache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network returned non-200');
        } catch {
          // Network failed or timed out: fall back to cached data
          const cachedResponse = await dataCache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Also check static cache if precached
          const shellCached = await caches.match(request);
          if (shellCached) {
            return shellCached;
          }

          // If JSON request and nothing in cache, return an empty JSON structure rather than crashing
          return new Response(JSON.stringify({ error: 'offline', offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // 2. Navigation / HTML Strategy: Network-first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetchWithTimeout(request, 3000);
          if (networkResponse && networkResponse.ok) {
            const staticCache = await caches.open(CACHE_NAME_STATIC);
            staticCache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch {
          // Fall back to cached shell
        }

        const cached = (await caches.match(request)) || (await caches.match('./index.html')) || (await caches.match('./'));
        if (cached) {
          return cached;
        }

        return new Response('Offline - No connection available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate / Cache-First
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        // Revalidate in background
        fetch(request)
          .then((fresh) => {
            if (fresh && fresh.ok) {
              caches.open(CACHE_NAME_STATIC).then((cache) => cache.put(request, fresh));
            }
          })
          .catch(() => {});
        return cached;
      }

      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME_STATIC);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return new Response('', { status: 408 });
      }
    })()
  );
});
