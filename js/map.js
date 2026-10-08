/**
 * Google Maps Platform Integration for Tab D (Max Billing Discounts).
 * Built with @googlemaps/js-api-loader, AdvancedMarkerElement, and @googlemaps/markerclusterer.
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { getStoreCoordinates, loadGeocodedLocations } from './israel_cities.js';

// Configuration
const GOOGLE_MAPS_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_MAPS_API_KEY) || 'AIzaSyDgwgC8GjCKP9_vGTluGFiECIq15Nz9BeQ';
const MAP_ID = 'DEMO_MAP_ID';
const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

// Internal module state
let mapInstance = null;
let markerClustererInstance = null;
let currentMarkers = [];
let infoWindowInstance = null;
let userLocationMarker = null;
let isMapInitialized = false;
let mapInitPromise = null;
let isMaximized = false;
let onStoreSelectCallback = null;
let onMarkerClickCallback = null;
let onBoundsChangeCallback = null;
let onMapErrorCallback = null;
let latestValidBounds = null;
let idleListener = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global auth failure handler for Google Maps Platform
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.error('Google Maps Platform authentication failure (gm_authFailure)');
    const err = new Error('gm_authFailure: מפתח ה-API של Google Maps חסום או שאינו מורשה לדומיין זה.');
    if (onMapErrorCallback) onMapErrorCallback(err);
  };
}

/**
 * Configure API loader once
 */
setOptions({
  key: GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'he',
  region: 'IL'
});

/**
 * Set or update map callbacks
 */
export function setMapCallbacks(callbacks = {}) {
  if (callbacks.onStoreSelect !== undefined) onStoreSelectCallback = callbacks.onStoreSelect;
  if (callbacks.onMarkerClick !== undefined) onMarkerClickCallback = callbacks.onMarkerClick;
  if (callbacks.onBoundsChange !== undefined) onBoundsChangeCallback = callbacks.onBoundsChange;
  if (callbacks.onError !== undefined) onMapErrorCallback = callbacks.onError;
}

/**
 * Initialize Google Maps instance lazily into target container
 */
export async function initBillingMap(containerElement, options = {}) {
  if (options.onStoreSelect) onStoreSelectCallback = options.onStoreSelect;
  if (options.onMarkerClick) onMarkerClickCallback = options.onMarkerClick;
  if (options.onBoundsChange) onBoundsChangeCallback = options.onBoundsChange;
  if (options.onError) onMapErrorCallback = options.onError;

  if (isMapInitialized && mapInstance) {
    // If container was previously hidden or resized, trigger resize event
    setTimeout(() => {
      if (mapInstance && window.google?.maps?.event) {
        google.maps.event.trigger(mapInstance, 'resize');
      }
    }, 60);
    return mapInstance;
  }

  // Return existing in-flight promise to avoid duplicate initialization race conditions
  if (mapInitPromise) {
    return mapInitPromise;
  }

  mapInitPromise = (async () => {
    try {
      // Load Google Maps libraries and pre-geocoded locations in parallel with preview timeout guard
      const timeoutGuard = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('פסק זמן בהתחברות לשירות המפות של Google. אנא נסה שוב.')), 14000);
      });

      const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.race([
        Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('core'),
          loadGeocodedLocations().catch(() => ({}))
        ]),
        timeoutGuard
      ]);

      // Ensure AdvancedMarkerElement delegates addListener calls (e.g., from MarkerClusterer)
      // to addEventListener to avoid deprecation warnings in Google Maps API
      if (AdvancedMarkerElement && AdvancedMarkerElement.prototype) {
        const origAddListener = AdvancedMarkerElement.prototype.addListener;
        AdvancedMarkerElement.prototype.addListener = function (eventName, handler) {
          if (typeof this.addEventListener === 'function') {
            const gmpEvent = eventName.startsWith('gmp-') ? eventName : (eventName === 'click' ? 'gmp-click' : eventName);
            this.addEventListener(gmpEvent, handler);
            return {
              remove: () => this.removeEventListener(gmpEvent, handler)
            };
          }
          if (typeof origAddListener === 'function') {
            return origAddListener.call(this, eventName, handler);
          }
        };
      }

      const controlPos = window.google?.maps?.ControlPosition?.LEFT_BOTTOM ?? 9;

      mapInstance = new Map(containerElement, {
        center: { lat: 31.85, lng: 34.85 }, // Center of central Israel
        zoom: 10,
        mapId: MAP_ID,
        internalUsageAttributionIds: [ATTRIBUTION_ID],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        zoomControl: true,
        zoomControlOptions: {
          position: controlPos
        }
      });

      infoWindowInstance = new InfoWindow({
        disableAutoPan: false
      });

      if (typeof MarkerClusterer === 'function') {
        try {
          markerClustererInstance = new MarkerClusterer({
            map: mapInstance,
            markers: []
          });
        } catch (clusterErr) {
          console.warn('MarkerClusterer init skipped:', clusterErr);
        }
      }

      // Attach idle listener to report visible markers in current map viewport
      if (idleListener) google.maps.event.removeListener(idleListener);
      idleListener = google.maps.event.addListener(mapInstance, 'idle', () => {
        if (!mapInstance || !onBoundsChangeCallback) return;
        const bounds = mapInstance.getBounds();
        if (!bounds) return;

        let inViewCount = 0;
        for (let i = 0; i < currentMarkers.length; i++) {
          const pos = currentMarkers[i].position;
          if (pos && bounds.contains(pos)) {
            inViewCount++;
          }
        }

        onBoundsChangeCallback({
          inViewCount,
          totalMarkers: currentMarkers.length,
          hasActiveMarkers: currentMarkers.length > 0
        });
      });

      // Trigger resize after layout paint
      setTimeout(() => {
        if (mapInstance && window.google?.maps?.event) {
          google.maps.event.trigger(mapInstance, 'resize');
        }
      }, 100);

      isMapInitialized = true;
      return mapInstance;
    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      if (onMapErrorCallback) onMapErrorCallback(err);
      throw err;
    } finally {
      mapInitPromise = null;
    }
  })();

  return mapInitPromise;
}

// Client-side on-demand geocoding cache and throttled queue
const clientGeoCache = new Map();
try {
  const saved = localStorage.getItem('behatsdaa_client_geocache');
  if (saved) {
    const parsed = JSON.parse(saved);
    for (const [k, v] of Object.entries(parsed)) {
      clientGeoCache.set(k, v);
    }
  }
} catch (e) {}

let geocodeQueue = [];
let isGeocodingQueueProcessing = false;

async function processGeocodeQueue() {
  if (isGeocodingQueueProcessing || geocodeQueue.length === 0) return;
  isGeocodingQueueProcessing = true;

  while (geocodeQueue.length > 0) {
    const { store, marker } = geocodeQueue.shift();
    if (!store || !marker || !store.city || !store.address) continue;

    const cacheKey = `${store.city}|${store.address}`.trim();
    if (clientGeoCache.has(cacheKey)) {
      const c = clientGeoCache.get(cacheKey);
      if (c && c.lat && c.lng) {
        store.lat = c.lat;
        store.lng = c.lng;
        marker.position = { lat: c.lat, lng: c.lng };
      }
      continue;
    }

    try {
      const cleanAddr = store.address.replace(/[\(\),].*$/, '').replace(/["']/g, '').trim();
      const query = `${cleanAddr} ${store.city} ישראל`;
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.features?.[0]?.geometry?.coordinates) {
          const coords = data.features[0].geometry.coordinates;
          const lng = coords[0];
          const lat = coords[1];
          if (lat > 29.3 && lat < 33.5 && lng > 34.1 && lng < 35.9) {
            clientGeoCache.set(cacheKey, { lat, lng });
            store.lat = lat;
            store.lng = lng;
            marker.position = { lat, lng };
            try {
              const obj = {};
              clientGeoCache.forEach((v, k) => { obj[k] = v; });
              localStorage.setItem('behatsdaa_client_geocache', JSON.stringify(obj));
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      // Ignore background geocode errors
    }

    // Gentle 150ms delay between requests to be polite
    await new Promise(r => setTimeout(r, 150));
  }

  isGeocodingQueueProcessing = false;
}

function queueOnDemandGeocode(store, marker) {
  if (!store || !marker || !store.address || !store.city) return;
  const cacheKey = `${store.city}|${store.address}`.trim();
  if (clientGeoCache.has(cacheKey)) {
    const c = clientGeoCache.get(cacheKey);
    if (c && c.lat && c.lng) {
      store.lat = c.lat;
      store.lng = c.lng;
      marker.position = { lat: c.lat, lng: c.lng };
      return;
    }
  }

  if (geocodeQueue.length < 40) {
    geocodeQueue.push({ store, marker });
    processGeocodeQueue();
  }
}

/**
 * Update map markers with a new set of stores
 */
export async function updateMapMarkers(stores, options = {}) {
  if (!mapInstance || !isMapInitialized) return;

  const { AdvancedMarkerElement } = await importLibrary('marker');
  const { LatLngBounds } = await importLibrary('core');

  // Clear existing markers & cluster
  if (markerClustererInstance) {
    try {
      markerClustererInstance.clearMarkers();
    } catch (e) {
      console.warn('Clusterer clear error:', e);
    }
  }
  currentMarkers.forEach(m => {
    m.map = null;
  });
  currentMarkers = [];

  if (!stores || stores.length === 0) return;

  // We filter out purely online stores and plot physical stores
  // For supreme performance with 10k items, we take matching stores (up to 600 in active view)
  const physicalStores = stores.filter(s => {
    const c = (s.city || '').toLowerCase();
    return c && c !== 'online' && !c.includes('אונליין');
  });

  const storesToPlot = physicalStores.slice(0, 600);
  const bounds = new LatLngBounds();
  let hasValidCoords = false;

  const markers = [];
  let topZIndexCounter = 3000;
  let activeBadgeElement = null;

  // Group stores by identical/near-identical location so stores in the same building (e.g. malls, towers)
  // never completely cover one another.
  const locationGroups = new Map();
  const storesWithCoords = [];

  storesToPlot.forEach(store => {
    const coords = getStoreCoordinates(store);
    if (!coords) return;

    // Use precise coordinate key rounded to ~10m
    const coordKey = `${coords.lat.toFixed(5)}_${coords.lng.toFixed(5)}`;
    if (!locationGroups.has(coordKey)) {
      locationGroups.set(coordKey, []);
    }
    const group = locationGroups.get(coordKey);
    const indexInGroup = group.length;
    group.push(store);

    storesWithCoords.push({
      store,
      coords,
      coordKey,
      indexInGroup
    });
  });

  storesWithCoords.forEach(({ store, coords, coordKey, indexInGroup }) => {
    const group = locationGroups.get(coordKey);
    const groupCount = group ? group.length : 1;

    let markerLat = coords.lat;
    let markerLng = coords.lng;

    // Fan-out/offset identical building coordinates slightly so both badges are visible side-by-side
    if (groupCount > 1) {
      if (groupCount === 2) {
        const offset = indexInGroup === 0 ? -0.00018 : 0.00018;
        markerLng += offset * 1.15;
        markerLat += (indexInGroup === 0 ? -0.00004 : 0.00004);
      } else {
        const angle = (indexInGroup / groupCount) * 2 * Math.PI;
        const radius = 0.00022; // ~20 meters
        markerLat += Math.sin(angle) * radius * 0.75;
        markerLng += Math.cos(angle) * radius * 1.15;
      }
    }

    bounds.extend({ lat: markerLat, lng: markerLng });
    hasValidCoords = true;

    // Format exact address cleanly
    let exactAddress = '';
    if (store.address && store.city) {
      if (store.address.includes(store.city)) {
        exactAddress = store.address;
      } else {
        exactAddress = `${store.address}, ${store.city}`;
      }
    } else {
      exactAddress = store.address || store.city || '';
    }

    // Custom HTML pin marker showing Store Name, Exact Address & Discount %
    const badgeEl = document.createElement('div');
    badgeEl.className = 'group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-150 hover:scale-105 active:scale-95';
    badgeEl.setAttribute('dir', 'rtl');
    badgeEl.innerHTML = `
      <div class="pin-card-wrapper flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-800 dark:text-slate-100 px-2 py-1 rounded-xl shadow-md border border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:shadow-lg max-w-[210px] text-right font-sans transition-all">
        <div class="flex-shrink-0 bg-purple-600 text-white font-black text-[11px] px-1.5 py-0.5 rounded-lg tracking-tight shadow-xs flex items-center justify-center">
          <span>${escapeHtml(String(store.discount || 5))}%</span>
        </div>
        <div class="flex flex-col min-w-0 leading-tight">
          <span class="text-xs font-bold text-slate-900 dark:text-white truncate block max-w-[135px]">${escapeHtml(store.name || '')}</span>
          ${exactAddress ? `<span class="text-[10px] text-slate-500 dark:text-slate-400 truncate block max-w-[135px] font-medium">${escapeHtml(exactAddress)}</span>` : ''}
        </div>
      </div>
      <div class="w-2 h-2 bg-white/95 dark:bg-slate-900/95 border-r border-b border-purple-300 dark:border-purple-700 rotate-45 -mt-1 shadow-xs group-hover:border-purple-500"></div>
    `;

    const marker = new AdvancedMarkerElement({
      position: { lat: markerLat, lng: markerLng },
      title: `${store.name}${exactAddress ? ' - ' + exactAddress : ''} (${store.discount || 5}%)`,
      content: badgeEl,
      zIndex: 100 + indexInGroup
    });

    const activateMarkerAndSelect = () => {
      // 1. Immediately bring to the very top above all other markers
      marker.zIndex = ++topZIndexCounter;
      badgeEl.style.zIndex = String(topZIndexCounter);

      // Highlight active pin
      if (activeBadgeElement && activeBadgeElement !== badgeEl) {
        const prevCard = activeBadgeElement.querySelector('.pin-card-wrapper');
        if (prevCard) {
          prevCard.classList.remove('ring-2', 'ring-purple-600', 'border-purple-600', 'shadow-2xl', 'bg-purple-50', 'dark:bg-purple-950/70');
        }
      }
      activeBadgeElement = badgeEl;
      const currentCard = badgeEl.querySelector('.pin-card-wrapper');
      if (currentCard) {
        currentCard.classList.add('ring-2', 'ring-purple-600', 'border-purple-600', 'shadow-2xl', 'bg-purple-50', 'dark:bg-purple-950/70');
      }

      // 2. Open rich InfoWindow
      const addressText = exactAddress || store.city || '';
      const navUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((store.name || '') + ' ' + (addressText || ''))}`;

      const contentString = `
        <div dir="rtl" class="p-3 text-right max-w-xs font-sans text-slate-800">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h4 class="font-bold text-sm text-slate-900 leading-tight">${escapeHtml(store.name || '')}</h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
              ${escapeHtml(String(store.discount || 5))}% במעמד החיוב
            </span>
          </div>
          <div class="mt-2 space-y-1 text-xs text-slate-600">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-slate-400">כתובת:</span>
              <span class="font-semibold text-slate-800">${escapeHtml(addressText)}</span>
            </div>
            ${store.category ? `
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-slate-400">קטגוריה:</span>
              <span>${escapeHtml(store.category)}</span>
            </div>` : ''}
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button type="button" id="info-window-view-btn" data-store-id="${store.id}" class="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1">
              <span>לפרטים מלאים</span>
            </button>
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition inline-flex items-center gap-1">
              <span>נווט ב-Maps</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </div>
      `;

      infoWindowInstance.setContent(contentString);
      infoWindowInstance.open({
        anchor: marker,
        map: mapInstance
      });

      // Hook click on InfoWindow button for detailed modal
      setTimeout(() => {
        const btn = document.getElementById('info-window-view-btn');
        if (btn && onStoreSelectCallback) {
          btn.addEventListener('click', () => {
            onStoreSelectCallback(store);
          });
        }
      }, 50);

      // 3. Scroll to store in store list below map
      if (onMarkerClickCallback) {
        onMarkerClickCallback(store);
      }
    };

    // Bring marker to top on hover
    badgeEl.addEventListener('mouseenter', () => {
      marker.zIndex = ++topZIndexCounter;
      badgeEl.style.zIndex = String(topZIndexCounter);
    });

    // Handle clicks directly on the DOM element and through Google Maps event
    let lastActionTime = 0;
    const onTrigger = (e) => {
      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      }
      const now = Date.now();
      if (now - lastActionTime < 180) return;
      lastActionTime = now;
      activateMarkerAndSelect();
    };

    badgeEl.addEventListener('click', onTrigger);
    badgeEl.addEventListener('pointerup', onTrigger);

    if (typeof marker.addEventListener === 'function') {
      marker.addEventListener('gmp-click', onTrigger);
    } else if (typeof marker.addListener === 'function') {
      marker.addListener('click', onTrigger);
    }

    markers.push(marker);

    // If marker is at city fallback but has a specific address, queue it for precise background geocoding
    if (!coords.isExact && store.address && store.city) {
      queueOnDemandGeocode(store, marker);
    }
  });

  currentMarkers = markers;
  if (markerClustererInstance) {
    try {
      markerClustererInstance.addMarkers(markers);
    } catch (e) {
      console.warn('MarkerClusterer addMarkers error, falling back to direct map markers:', e);
      markers.forEach(m => { m.map = mapInstance; });
    }
  } else {
    markers.forEach(m => { m.map = mapInstance; });
  }

  // Smoothly fit bounds if requested or if search changed
  if (hasValidCoords && (options.autoFit !== false)) {
    latestValidBounds = bounds;
    if (storesToPlot.length === 1) {
      const c = getStoreCoordinates(storesToPlot[0]);
      mapInstance.setCenter({ lat: c.lat, lng: c.lng });
      mapInstance.setZoom(14);
    } else {
      mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      // Don't over-zoom when only 2 close points
      const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
        if (mapInstance.getZoom() > 15) mapInstance.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  } else if (!stores || stores.length === 0) {
    latestValidBounds = null;
    mapInstance.setCenter({ lat: 31.85, lng: 34.85 });
    mapInstance.setZoom(9);
  }

  return {
    plottedCount: storesToPlot.length,
    physicalCount: physicalStores.length
  };
}

/**
 * Recenter map to all currently plotted store markers
 */
export function recenterMapToAllMarkers() {
  if (!mapInstance) return;
  if (latestValidBounds && !latestValidBounds.isEmpty()) {
    mapInstance.fitBounds(latestValidBounds, { top: 40, right: 40, bottom: 40, left: 40 });
  } else {
    mapInstance.setCenter({ lat: 31.85, lng: 34.85 });
    mapInstance.setZoom(9);
  }
}

/**
 * Center map on user's current GPS location
 */
export async function centerOnUserLocation(statusCallback) {
  if (!navigator.geolocation) {
    if (statusCallback) statusCallback({ error: 'הדפדפן שלך אינו תומך באיכון מיקום' });
    return;
  }

  if (statusCallback) statusCallback({ loading: true, message: 'מאתר מיקום...' });

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if (!mapInstance) return;

      const { AdvancedMarkerElement } = await importLibrary('marker');

      // Create or update user location pin
      if (!userLocationMarker) {
        // High visibility user pin with pulsing ring
        const userPinContainer = document.createElement('div');
        userPinContainer.className = 'relative flex items-center justify-center';
        userPinContainer.innerHTML = `
          <div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-md animate-ping absolute opacity-75"></div>
          <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg relative z-10"></div>
        `;

        userLocationMarker = new AdvancedMarkerElement({
          map: mapInstance,
          position: userPos,
          title: 'המיקום הנוכחי שלך',
          content: userPinContainer
        });
      } else {
        userLocationMarker.position = userPos;
      }

      mapInstance.panTo(userPos);
      mapInstance.setZoom(14);

      if (statusCallback) statusCallback({ success: true, message: 'המיקום אותר בהצלחה!' });
    },
    (err) => {
      let errMsg = 'לא ניתן לאתר את המיקום שלך.';
      if (err.code === 1) errMsg = 'הגישה למיקום נדחתה בהגדרות הדפדפן.';
      else if (err.code === 2) errMsg = 'נתוני המיקום אינם זמינים כעת.';
      else if (err.code === 3) errMsg = 'בקשת המיקום נכשלה עקב חריגת זמן.';
      if (statusCallback) statusCallback({ error: errMsg });
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/**
 * Toggle maximize / normal map container sizing
 */
export function toggleMapMaximize(containerWrapper) {
  isMaximized = !isMaximized;

  if (isMaximized) {
    containerWrapper.classList.add('fixed', 'inset-4', 'z-50', 'shadow-2xl', 'border-2', 'border-purple-500');
    containerWrapper.classList.remove('rounded-2xl', 'relative');
    containerWrapper.style.height = 'calc(100vh - 2rem)';
  } else {
    containerWrapper.classList.remove('fixed', 'inset-4', 'z-50', 'shadow-2xl', 'border-2', 'border-purple-500');
    containerWrapper.classList.add('rounded-2xl', 'relative');
    containerWrapper.style.height = '';
  }

  // Trigger Google Maps resize event so viewport fills completely
  setTimeout(() => {
    if (mapInstance) {
      google.maps.event.trigger(mapInstance, 'resize');
    }
  }, 100);

  return isMaximized;
}

export function isMapReady() {
  return isMapInitialized && !!mapInstance;
}
