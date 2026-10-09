import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import * as markerClustererPkg from '@googlemaps/markerclusterer';
import { BillingStore } from '../types/billing';

const defKey = 'def' + 'ault';
const MarkerClustererClass: any =
  (markerClustererPkg as any).MarkerClusterer ||
  (markerClustererPkg as any)[defKey]?.MarkerClusterer ||
  (markerClustererPkg as any)[defKey];

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyDgwgC8GjCKP9_vGTluGFiECIq15Nz9BeQ';

export function useGoogleMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  stores: BillingStore[],
  onMarkerClick?: (store: BillingStore) => void
) {
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;

    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: 'weekly',
      language: 'he',
      region: 'IL'
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker')
    ])
      .then(([mapsLib]: [any, any?]) => {
        if (isCancelled || !containerRef.current) return;

        const israelCenter = { lat: 31.95, lng: 34.9 };

        const map = new mapsLib.Map(containerRef.current, {
          center: israelCenter,
          zoom: 8,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy'
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLib.InfoWindow();

        if (MarkerClustererClass) {
          clustererRef.current = new MarkerClustererClass({ map });
        }

        setIsLoaded(true);
      })
      .catch((err: any) => {
        if (!isCancelled) {
          console.error('Failed to initialize Google Maps:', err);
          setLoadError(err.message || 'שגיאה בטעינת המפה');
        }
      });

    return () => {
      isCancelled = true;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      markersRef.current.forEach(m => {
        if (m.setMap) m.setMap(null);
      });
      markersRef.current = [];
    };
  }, [containerRef]);

  // Update markers when stores change
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    // Clear existing markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach(m => {
      if (m.setMap) m.setMap(null);
    });
    markersRef.current = [];

    const bounds = new (window as any).google.maps.LatLngBounds();
    let validCount = 0;

    const newMarkers = stores
      .filter(s => s.lat && s.lng)
      .map(store => {
        const pos = { lat: Number(store.lat), lng: Number(store.lng) };
        bounds.extend(pos);
        validCount++;

        const marker = new (window as any).google.maps.Marker({
          position: pos,
          title: store.name
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            const content = `
              <div dir="rtl" style="font-family: system-ui, sans-serif; padding: 6px; max-width: 240px; text-align: right;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${store.name}</div>
                <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">${store.full_address || store.address || store.city || ''}</div>
                ${store.discount ? `<div style="display: inline-block; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; background-color: #d1fae5; color: #065f46;">${store.discount}% הנחה במעמד החיוב</div>` : ''}
              </div>
            `;
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(mapRef.current, marker);
          }
          if (onMarkerClick) onMarkerClick(store);
        });

        return marker;
      });

    markersRef.current = newMarkers;

    if (clustererRef.current) {
      clustererRef.current.addMarkers(newMarkers);
    } else {
      newMarkers.slice(0, 500).forEach(m => m.setMap(mapRef.current));
    }

    if (validCount > 0 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [stores, isLoaded, onMarkerClick]);

  return { isLoaded, loadError, map: mapRef.current };
}
