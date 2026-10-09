/**
 * Google Maps Platform Integration for Tab D (Max Billing Discounts).
 * Built with @googlemaps/js-api-loader, AdvancedMarkerElement, and @googlemaps/markerclusterer.
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import * as markerClustererPkg from '@googlemaps/markerclusterer';
const defKey = 'def' + 'ault';
const MarkerClusterer = markerClustererPkg.MarkerClusterer || markerClustererPkg[defKey]?.MarkerClusterer || markerClustererPkg[defKey];
import { formatFullAddress } from './utils.js';
import { getStoreCoordinates, loadGeocodedLocations } from './israel_cities.js';
import { isFavorite } from './favorites.js';

// Configuration
const GOOGLE_MAPS_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_MAPS_API_KEY) || 'AIzaSyDgwgC8GjCKP9_vGTluGFiECIq15Nz9BeQ';
const MAP_ID = 'DEMO_MAP_ID';
const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

/**
 * Geographic bounding boxes and center coordinates for quick city area filter chips (R1)
 */
export const AREA_BOUNDS = {
  user_loc: {
    key: 'user_loc',
    label: 'קרוב אליי',
    isGeolocation: true
  },
  tel_aviv: {
    key: 'tel_aviv',
    label: 'תל אביב',
    center: { lat: 32.0853, lng: 34.7818 },
    zoom: 13,
    bounds: { south: 32.0250, west: 34.7350, north: 32.1450, east: 34.8350 }
  },
  jerusalem: {
    key: 'jerusalem',
    label: 'ירושלים',
    center: { lat: 31.7683, lng: 35.2137 },
    zoom: 13,
    bounds: { south: 31.7100, west: 35.1500, north: 31.8300, east: 35.2600 }
  },
  haifa: {
    key: 'haifa',
    label: 'חיפה',
    center: { lat: 32.7940, lng: 34.9896 },
    zoom: 13,
    bounds: { south: 32.7400, west: 34.9300, north: 32.8450, east: 35.0500 }
  },
  rishon_lezion: {
    key: 'rishon_lezion',
    label: 'ראשון לציון',
    center: { lat: 31.9730, lng: 34.7925 },
    zoom: 13,
    bounds: { south: 31.9250, west: 34.7350, north: 32.0200, east: 34.8450 }
  },
  beer_sheva: {
    key: 'beer_sheva',
    label: 'באר שבע',
    center: { lat: 31.2530, lng: 34.7915 },
    zoom: 13,
    bounds: { south: 31.2100, west: 34.7400, north: 31.2950, east: 34.8400 }
  },
  center: {
    key: 'center',
    label: 'מרכז',
    center: { lat: 32.0500, lng: 34.8500 },
    zoom: 11,
    bounds: { south: 31.8000, west: 34.6500, north: 32.3500, east: 35.0500 }
  },
  north: {
    key: 'north',
    label: 'צפון',
    center: { lat: 32.8500, lng: 35.2500 },
    zoom: 10,
    bounds: { south: 32.4500, west: 34.9000, north: 33.3000, east: 35.7500 }
  },
  south: {
    key: 'south',
    label: 'דרום',
    center: { lat: 31.3500, lng: 34.7500 },
    zoom: 10,
    bounds: { south: 31.0000, west: 34.3000, north: 31.8000, east: 35.2000 }
  }
};

// Internal module state
let mapInstance = null;
let markerClustererInstance = null;
let currentMarkers = [];
let currentRenderedStoreIds = new Set();
let activePhysicalStores = [];
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

function getCachedStoreCoordinates(store) {
  if (store._coords) return store._coords;
  const coords = getStoreCoordinates(store);
  if (coords) {
    store._coords = coords;
  }
  return coords;
}

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
 * Returns the current Google Maps instance (or null if not initialized).
 */
export function getMapInstance() {
  return mapInstance;
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

      // Attach idle listener to dynamically filter visible markers in current map viewport
      if (idleListener) google.maps.event.removeListener(idleListener);
      idleListener = google.maps.event.addListener(mapInstance, 'idle', () => {
        syncViewportMarkers();
      });

      // Clear active chip highlight when user manually drags map
      mapInstance.addListener('dragstart', () => {
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          const activeChip = document.querySelector('#billing-map-area-chips .billing-map-area-chip.active');
          if (activeChip) {
            activeChip.classList.remove('active', 'bg-purple-600', 'text-white', 'border-purple-600', 'shadow-xs', 'ring-2', 'ring-purple-600/30');
            activeChip.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200', 'border-slate-200', 'dark:border-slate-700', 'shadow-2xs');
            activeChip.setAttribute('aria-pressed', 'false');
          }
        }
      });

      // Expose map instance for automated test inspection and external access
      containerElement.__mapInstance = mapInstance;
      const mapWrapper = containerElement.closest ? containerElement.closest('#billing-map-wrapper') : (typeof document !== 'undefined' ? document.getElementById('billing-map-wrapper') : null);
      if (mapWrapper) mapWrapper.__mapInstance = mapInstance;
      if (typeof window !== 'undefined') window.__billingMapInstance = mapInstance;

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
 * Renders the given store entries on the map using AdvancedMarkerElement and MarkerClusterer.
 * Employs diffing to skip redundant marker reconstruction when store IDs are identical.
 */
async function renderMarkers(storesToRender) {
  // Diffing check: if the store IDs are identical, do not destroy and re-create DOM pins
  let hasChanged = false;
  if (storesToRender.length !== currentMarkers.length) {
    hasChanged = true;
  } else {
    for (let i = 0; i < storesToRender.length; i++) {
      if (!currentRenderedStoreIds.has(storesToRender[i].store.id)) {
        hasChanged = true;
        break;
      }
    }
  }

  if (!hasChanged) return;

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
  currentRenderedStoreIds.clear();

  if (storesToRender.length === 0) return;

  const { AdvancedMarkerElement } = await importLibrary('marker');

  const markers = [];
  let topZIndexCounter = 3000;
  let activeBadgeElement = null;

  // Group stores by identical/near-identical location so stores in the same building
  // never completely cover one another.
  const locationGroups = new Map();
  storesToRender.forEach(item => {
    const coordKey = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
    if (!locationGroups.has(coordKey)) {
      locationGroups.set(coordKey, []);
    }
    const group = locationGroups.get(coordKey);
    const indexInGroup = group.length;
    group.push(item);
    item.indexInGroup = indexInGroup;
    item.coordKey = coordKey;
  });

  storesToRender.forEach(({ store, coords, coordKey, indexInGroup, lat, lng }) => {
    const group = locationGroups.get(coordKey);
    const groupCount = group ? group.length : 1;

    let markerLat = lat;
    let markerLng = lng;

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

    let exactAddress = store.full_address || formatFullAddress(store);
    if (exactAddress === 'Online / כל הארץ') exactAddress = '';

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
      marker.zIndex = ++topZIndexCounter;
      badgeEl.style.zIndex = String(topZIndexCounter);

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

      setTimeout(() => {
        const btn = document.getElementById('info-window-view-btn');
        if (btn && onStoreSelectCallback) {
          btn.addEventListener('click', () => {
            onStoreSelectCallback(store);
          });
        }
      }, 50);

      if (onMarkerClickCallback) {
        onMarkerClickCallback(store);
      }
    };

    badgeEl.addEventListener('mouseenter', () => {
      marker.zIndex = ++topZIndexCounter;
      badgeEl.style.zIndex = String(topZIndexCounter);
    });

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
    currentRenderedStoreIds.add(store.id);

    if (!coords.isExact && store.address && store.city) {
      queueOnDemandGeocode(store, marker);
    }
  });

  currentMarkers = markers;
  if (markerClustererInstance) {
    try {
      markerClustererInstance.addMarkers(markers);
    } catch (e) {
      markers.forEach(m => { m.map = mapInstance; });
    }
  } else {
    markers.forEach(m => { m.map = mapInstance; });
  }
}

/**
 * Synchronizes visible markers and badges with the current map viewport bounds.
 * Called on Google Maps 'idle' event and after filter updates.
 */
export function syncViewportMarkers() {
  if (!mapInstance || !isMapInitialized) return;
  const zoom = mapInstance.getZoom() ?? 9;
  const bounds = mapInstance.getBounds();

  const totalPhysicalCount = activePhysicalStores.length;
  const isNationwide = (zoom < 10);

  let inBoundsStores = [];

  if (totalPhysicalCount === 0) {
    inBoundsStores = [];
  } else if (isNationwide || !bounds) {
    // Nationwide mode (zoom < 10): all active physical stores are candidates
    inBoundsStores = activePhysicalStores;
  } else {
    // Regional/Local mode (zoom >= 10): filter against viewport bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const north = typeof ne.lat === 'function' ? ne.lat() : ne.lat;
    const east = typeof ne.lng === 'function' ? ne.lng() : ne.lng;
    const south = typeof sw.lat === 'function' ? sw.lat() : sw.lat;
    const west = typeof sw.lng === 'function' ? sw.lng() : sw.lng;

    for (let i = 0; i < activePhysicalStores.length; i++) {
      const item = activePhysicalStores[i];
      if (item.lat >= south && item.lat <= north && item.lng >= west && item.lng <= east) {
        inBoundsStores.push(item);
      }
    }
  }

  const inBoundsCount = inBoundsStores.length;
  const isCeilingHit = inBoundsCount > 600;

  let storesToRender = inBoundsStores;
  if (isCeilingHit) {
    const center = mapInstance.getCenter();
    const centerLat = center && typeof center.lat === 'function' ? center.lat() : center?.lat;
    const centerLng = center && typeof center.lng === 'function' ? center.lng() : center?.lng;

    // Smart Multi-Criteria Relevance & Proximity Ranking:
    // 1. Favorites: +10,000 pts (Guaranteed visible pin)
    // 2. Exact Street Geocoded Address: +350 pts (true storefront vs. city center)
    // 3. Multi-Channel Benefit: +300 pts (also has reloadable card or voucher)
    // 4. Highest Discount: + (discount% * 20 pts)
    // 5. Center / GPS Proximity: - (distKm * 20 pts) (prioritize camera center)
    const scored = inBoundsStores.map(item => {
      let score = 0;
      const s = item.store;

      if (typeof isFavorite === 'function' && isFavorite('billing', s.id)) {
        score += 10000;
      }
      if (item.coords && item.coords.isExact) {
        score += 350;
      }
      if (s.store_id || (s.deals_count && s.deals_count > 0) || s.linked_store) {
        score += 300;
      }
      const disc = parseFloat(s.discount) || 0;
      score += disc * 20;

      if (centerLat != null && centerLng != null) {
        const dLat = (item.lat - centerLat) * 111;
        const dLng = (item.lng - centerLng) * 94;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        score -= Math.min(distKm * 20, 250);
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    storesToRender = scored.slice(0, 600).map(x => x.item);
  }
  const visibleCount = storesToRender.length;

  // Formulate exact Hebrew badge copy
  let badgeText = '';
  if (totalPhysicalCount === 0) {
    badgeText = '0 עסקים תואמים לסינון במפה';
  } else if (isNationwide) {
    if (totalPhysicalCount > 600) {
      badgeText = `${visibleCount.toLocaleString('he-IL')} מתוך ${totalPhysicalCount.toLocaleString('he-IL')} עסקים מוצגים (התקרב במפה להצגת כל העסקים באזור)`;
    } else {
      badgeText = `${totalPhysicalCount.toLocaleString('he-IL')} עסקים מוצגים`;
    }
  } else {
    // Regional/Local mode (zoom >= 10)
    if (inBoundsCount === 0) {
      badgeText = '0 עסקים באזור המוצג במפה';
    } else if (isCeilingHit) {
      badgeText = `600 מתוך ${inBoundsCount.toLocaleString('he-IL')} עסקים באזור המוצג במפה (התקרב במפה להצגת כל העסקים באזור)`;
    } else {
      badgeText = `${inBoundsCount.toLocaleString('he-IL')} עסקים באזור המוצג במפה`;
    }
  }

  // Render markers if changed
  renderMarkers(storesToRender);

  // Broadcast metrics through interface contract
  if (onBoundsChangeCallback) {
    onBoundsChangeCallback({
      visibleCount,
      totalPhysicalCount,
      isNationwide,
      inBoundsCount,
      isCeilingHit,
      bounds,
      zoom,
      badgeText,
      hasActiveMarkers: visibleCount > 0
    });
  }
}

/**
 * Update map markers with a new set of stores
 */
export async function updateMapMarkers(stores, options = {}) {
  if (!mapInstance || !isMapInitialized) return;

  const coreLib = await importLibrary('core').catch(() => ({}));
  const LatLngBoundsClass = coreLib?.LatLngBounds || window.google?.maps?.LatLngBounds;
  const bounds = LatLngBoundsClass ? new LatLngBoundsClass() : null;

  // Filter physical storefronts and cache coordinates
  const physicalStores = (stores || []).filter(s => {
    const c = (s.city || '').toLowerCase();
    return c && c !== 'online' && !c.includes('אונליין');
  });

  const physicalWithCoords = [];
  let hasValidCoords = false;

  for (let i = 0; i < physicalStores.length; i++) {
    const store = physicalStores[i];
    const coords = getCachedStoreCoordinates(store);
    if (coords) {
      physicalWithCoords.push({
        store,
        coords,
        lat: coords.lat,
        lng: coords.lng
      });
      if (bounds) bounds.extend({ lat: coords.lat, lng: coords.lng });
      hasValidCoords = true;
    }
  }

  activePhysicalStores = physicalWithCoords;

  if (activePhysicalStores.length === 0) {
    renderMarkers([]);
    if (onBoundsChangeCallback) {
      onBoundsChangeCallback({
        visibleCount: 0,
        totalPhysicalCount: 0,
        isNationwide: true,
        inBoundsCount: 0,
        isCeilingHit: false,
        bounds: null,
        zoom: mapInstance.getZoom() ?? 9,
        badgeText: '0 עסקים תואמים לסינון במפה',
        hasActiveMarkers: false
      });
    }
    return { plottedCount: 0, physicalCount: 0 };
  }

  if (options.autoFit !== false && hasValidCoords && bounds) {
    latestValidBounds = bounds;
    if (activePhysicalStores.length === 1) {
      mapInstance.setCenter({ lat: activePhysicalStores[0].lat, lng: activePhysicalStores[0].lng });
      mapInstance.setZoom(14);
    } else {
      if (activePhysicalStores.length > 2000) {
        mapInstance.setCenter({ lat: 31.85, lng: 34.85 });
        mapInstance.setZoom(9);
      } else {
        mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }
    if (window.google?.maps?.event) {
      google.maps.event.trigger(mapInstance, 'idle');
    }
  } else {
    syncViewportMarkers();
  }

  return {
    plottedCount: Math.min(activePhysicalStores.length, 600),
    physicalCount: activePhysicalStores.length
  };
}

/**
 * Recenter map to all currently plotted store markers
 */
export function recenterMapToAllMarkers() {
  if (!mapInstance) return;
  if (latestValidBounds && !latestValidBounds.isEmpty() && activePhysicalStores.length <= 2000) {
    mapInstance.fitBounds(latestValidBounds, { top: 40, right: 40, bottom: 40, left: 40 });
  } else {
    mapInstance.setCenter({ lat: 31.85, lng: 34.85 });
    mapInstance.setZoom(9);
    if (window.google?.maps?.event) {
      google.maps.event.trigger(mapInstance, 'idle');
    }
  }
}

/**
 * Smoothly fly the map camera to a designated city, region, or user location.
 * @param {string} areaKey - 'user_loc' | 'tel_aviv' | 'jerusalem' | 'haifa' | 'rishon_lezion' | 'beer_sheva' | 'center' | 'north' | 'south'
 * @param {Object} [options] - Optional settings
 * @returns {Promise<boolean>}
 */
export async function flyToArea(areaKey, options = {}) {
  if (!mapInstance) return false;

  if (areaKey === 'user_loc') {
    return centerOnUserLocation(options.statusCallback);
  }

  const preset = AREA_BOUNDS[areaKey];
  if (!preset) {
    console.warn(`flyToArea: unknown area key "${areaKey}"`);
    return false;
  }

  if (preset.center && typeof mapInstance.setCenter === 'function') {
    mapInstance.setCenter(preset.center);
  }
  if (preset.zoom && typeof mapInstance.setZoom === 'function') {
    mapInstance.setZoom(preset.zoom);
  }

  if (preset.bounds && typeof mapInstance.fitBounds === 'function') {
    if (window.google?.maps?.LatLngBounds) {
      const gBounds = new google.maps.LatLngBounds(
        { lat: preset.bounds.south, lng: preset.bounds.west },
        { lat: preset.bounds.north, lng: preset.bounds.east }
      );
      mapInstance.fitBounds(gBounds, { top: 35, right: 35, bottom: 35, left: 35 });
    } else {
      mapInstance.fitBounds(preset.bounds, { top: 35, right: 35, bottom: 35, left: 35 });
    }
    if (preset.zoom && typeof mapInstance.getZoom === 'function' && typeof mapInstance.setZoom === 'function') {
      if (mapInstance.getZoom() < preset.zoom) {
        mapInstance.setZoom(preset.zoom);
      }
    }
  }

  // In test environments or headless mocks, trigger idle if animation loop doesn't exist
  if (options.triggerIdleImmediate || (typeof window !== 'undefined' && !window.google?.maps?.version && window.google?.maps?.event)) {
    google.maps.event.trigger(mapInstance, 'idle');
  }

  return true;
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
