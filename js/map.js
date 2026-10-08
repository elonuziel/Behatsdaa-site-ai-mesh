/**
 * Google Maps Platform Integration for Tab D (Max Billing Discounts).
 * Built with @googlemaps/js-api-loader, AdvancedMarkerElement, and @googlemaps/markerclusterer.
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { getStoreCoordinates } from './israel_cities.js';

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDgwgC8GjCKP9_vGTluGFiECIq15Nz9BeQ';
const MAP_ID = 'DEMO_MAP_ID';
const ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

// Internal module state
let mapInstance = null;
let markerClustererInstance = null;
let currentMarkers = [];
let infoWindowInstance = null;
let userLocationMarker = null;
let isMapInitialized = false;
let isMapLoading = false;
let isMaximized = false;
let onStoreSelectCallback = null;

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
 * Initialize Google Maps instance lazily into target container
 */
export async function initBillingMap(containerElement, options = {}) {
  if (isMapInitialized && mapInstance) return mapInstance;
  if (isMapLoading) return null;

  isMapLoading = true;
  onStoreSelectCallback = options.onStoreSelect || null;

  try {
    const { Map, InfoWindow } = await importLibrary('maps');
    const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

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
        position: google.maps.ControlPosition.LEFT_BOTTOM
      }
    });

    infoWindowInstance = new InfoWindow({
      disableAutoPan: false
    });

    markerClustererInstance = new MarkerClusterer({
      map: mapInstance,
      markers: []
    });

    isMapInitialized = true;
    isMapLoading = false;
    return mapInstance;
  } catch (err) {
    isMapLoading = false;
    console.error('Failed to initialize Google Maps:', err);
    throw err;
  }
}

/**
 * Update map markers with a new set of stores
 */
export async function updateMapMarkers(stores, options = {}) {
  if (!mapInstance || !isMapInitialized) return;

  const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

  // Clear existing markers & cluster
  if (markerClustererInstance) {
    markerClustererInstance.clearMarkers();
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
  const bounds = new google.maps.LatLngBounds();
  let hasValidCoords = false;

  const markers = [];

  storesToPlot.forEach(store => {
    const coords = getStoreCoordinates(store);
    if (!coords) return;

    bounds.extend({ lat: coords.lat, lng: coords.lng });
    hasValidCoords = true;

    // Pin with discount badge styling
    const pin = new PinElement({
      glyph: `${store.discount || 5}%`,
      glyphColor: '#ffffff',
      background: '#9333ea', // Purple theme for billing discounts
      borderColor: '#7e22ce'
    });

    const marker = new AdvancedMarkerElement({
      position: { lat: coords.lat, lng: coords.lng },
      title: `${store.name} (${store.discount}%)`,
      content: pin.element
    });

    // Marker click event opens rich InfoWindow
    marker.addListener('click', () => {
      const addressText = store.address ? `${store.address}, ${store.city}` : store.city;
      const navUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((store.name || '') + ' ' + (addressText || ''))}`;

      const contentString = `
        <div dir="rtl" class="p-3 text-right max-w-xs font-sans text-slate-800">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h4 class="font-bold text-sm text-slate-900 leading-tight">${store.name}</h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
              ${store.discount}% במעמד החיוב
            </span>
          </div>
          <div class="mt-2 space-y-1 text-xs text-slate-600">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-slate-400">כתובת:</span>
              <span class="font-semibold text-slate-800">${addressText}</span>
            </div>
            ${store.category ? `
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-slate-400">קטגוריה:</span>
              <span>${store.category}</span>
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

      // Hook click on InfoWindow button
      setTimeout(() => {
        const btn = document.getElementById('info-window-view-btn');
        if (btn && onStoreSelectCallback) {
          btn.addEventListener('click', () => {
            onStoreSelectCallback(store);
          });
        }
      }, 50);
    });

    markers.push(marker);
  });

  currentMarkers = markers;
  if (markerClustererInstance) {
    markerClustererInstance.addMarkers(markers);
  }

  // Smoothly fit bounds if requested or if search changed
  if (hasValidCoords && (options.autoFit !== false)) {
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

      const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

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
