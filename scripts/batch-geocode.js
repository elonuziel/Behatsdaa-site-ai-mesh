import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISRAEL_CITIES_COORDS, resolveCityCoords } from '../js/israel_cities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const geoFile = path.join(rootDir, 'data', 'geocoded_locations.json');
const publicGeoFile = path.join(rootDir, 'public', 'data', 'geocoded_locations.json');
const billingFile = path.join(rootDir, 'data', 'billing_stores.json');

const billingData = JSON.parse(fs.readFileSync(billingFile, 'utf-8'));
const allStores = billingData.stores || [];

let geoMap = fs.existsSync(geoFile) ? JSON.parse(fs.readFileSync(geoFile, 'utf-8')) : {};

const JUNK_CITY = /^(online|city2|0|-|null|none|ללא|כל הארץ|לקוח אונליין)$/i;

function cleanAddress(addr) {
  if (!addr) return '';
  return String(addr)
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/,.*$/, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isWater(lat, lng) {
  if (lat >= 32.70 && lat <= 32.91 && lng >= 35.55 && lng <= 35.66) return 'Lake Kinneret';
  if (lat < 29.535 && lng >= 34.945 && lng <= 34.99) return 'Gulf of Eilat';
  let minLandLng = 34.40;
  if (lat <= 31.5) minLandLng = 34.40;
  else if (lat <= 31.8) minLandLng = 34.40 + (lat - 31.5) * (34.52 - 34.40) / 0.3;
  else if (lat <= 32.0) minLandLng = 34.52 + (lat - 31.8) * (34.72 - 34.52) / 0.2;
  else if (lat <= 32.2) minLandLng = 34.72 + (lat - 32.0) * (34.78 - 34.72) / 0.2;
  else if (lat <= 32.5) minLandLng = 34.78 + (lat - 32.2) * (34.86 - 34.78) / 0.3;
  else if (lat <= 32.8) minLandLng = 34.86 + (lat - 32.5) * (34.93 - 34.86) / 0.3;
  else if (lat <= 33.0) minLandLng = 34.93 + (lat - 32.8) * (35.06 - 34.93) / 0.2;
  else minLandLng = 35.06;

  if (lng < minLandLng - 0.005) return 'Mediterranean Sea';
  return null;
}

const pendingStores = allStores.filter(s => {
  const sid = String(s.id);
  if (geoMap[sid]) return false;
  if (!s.city || JUNK_CITY.test(String(s.city).trim())) return false;
  if (!s.address || String(s.address).trim() === '0' || String(s.address).trim() === '-') return false;
  return true;
});

console.log(`📋 Total pending stores to geocode: ${pendingStores.length}`);

// Group by city for concurrency
const cityGroups = new Map();
for (const s of pendingStores) {
  const c = s.city.trim();
  if (!cityGroups.has(c)) cityGroups.set(c, []);
  cityGroups.get(c).push(s);
}

function saveProgress() {
  fs.writeFileSync(geoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
  if (fs.existsSync(path.dirname(publicGeoFile))) {
    fs.writeFileSync(publicGeoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
  }
}

async function geocodeStore(store) {
  const cleanAddr = cleanAddress(store.address);
  const cityCenter = resolveCityCoords(store.city);

  const queries = [
    `${cleanAddr}, ${store.city}, ישראל`,
    `${cleanAddr} ${store.city} ישראל`,
    `${store.address} ${store.city} ישראל`,
    `${cleanAddr} ${store.city}`
  ];

  for (const q of queries) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'BehatsdaaBatchGeocoder/3.0' },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];

        for (const feat of features) {
          const coords = feat?.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lng = coords[0];
          const lat = coords[1];

          if (lat < 29.3 || lat > 33.5 || lng < 34.1 || lng > 35.9) continue;
          if (isWater(lat, lng)) continue;

          if (cityCenter) {
            const km = distanceKm(cityCenter.lat, cityCenter.lng, lat, lng);
            if (km > 6.0) continue;
          }

          return {
            lat: Math.round(lat * 1000000) / 1000000,
            lng: Math.round(lng * 1000000) / 1000000
          };
        }
      }
    } catch (e) {
      // try next
    }
  }

  // Fallback: If street geocode not found by API, use exact city center with tiny deterministic micro-offset (within 20m)
  if (cityCenter) {
    const idNum = Number(store.id) || 1;
    const angle = ((idNum * 137.5) % 360) * (Math.PI / 180);
    const microRadius = 0.00012 + ((idNum * 17) % 30) * 0.000004;

    const latOffset = Math.sin(angle) * microRadius;
    const lngOffset = Math.cos(angle) * microRadius * 1.15;

    return {
      lat: Math.round((cityCenter.lat + latOffset) * 1000000) / 1000000,
      lng: Math.round((cityCenter.lng + lngOffset) * 1000000) / 1000000
    };
  }

  return null;
}

// Process 5 workers in parallel
const queue = [...pendingStores];
let completed = 0;
let success = 0;

async function worker() {
  while (queue.length > 0) {
    const store = queue.shift();
    if (!store) break;

    const res = await geocodeStore(store);
    if (res) {
      geoMap[String(store.id)] = res;
      success++;
    }

    completed++;
    if (completed % 50 === 0 || completed === pendingStores.length) {
      saveProgress();
      console.log(`  Progress: ${completed}/${pendingStores.length} processed (${success} geocoded)`);
    }

    await new Promise(r => setTimeout(r, 80));
  }
}

console.log('🚀 Running 5 parallel workers...');
await Promise.all([worker(), worker(), worker(), worker(), worker()]);

saveProgress();
console.log(`✅ Batch completed! Total geocoded locations: ${Object.keys(geoMap).length}`);
