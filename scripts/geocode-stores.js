/**
 * Automated Exact Rooftop/Street Geocoding Utility for Behatsdaa Physical Stores
 * 
 * Usage:
 *   node scripts/geocode-stores.js                    # Batch geocodes physical stores
 *   node scripts/geocode-stores.js --city "תל אביב"
 *   node scripts/geocode-stores.js --limit 500
 *   node scripts/geocode-stores.js --force            # Re-geocodes records
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISRAEL_CITIES_COORDS } from '../js/israel_cities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const publicDataDir = path.join(rootDir, 'public', 'data');
const geoFile = path.join(dataDir, 'geocoded_locations.json');
const billingFile = path.join(dataDir, 'billing_stores.json');

if (!fs.existsSync(billingFile)) {
  console.error('❌ data/billing_stores.json not found!');
  process.exit(1);
}

const billingData = JSON.parse(fs.readFileSync(billingFile, 'utf-8'));
const allStores = billingData.stores || [];

let geocodedMap = {};
if (fs.existsSync(geoFile)) {
  try {
    geocodedMap = JSON.parse(fs.readFileSync(geoFile, 'utf-8'));
  } catch (e) {
    geocodedMap = {};
  }
}

// Parse CLI args
const args = process.argv.slice(2);
let targetCity = null;
let limit = 15000; // Batch all by default
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--city' && args[i + 1]) targetCity = args[i + 1];
  if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
  if (args[i] === '--force') force = true;
}

const JUNK_CITY = /^(online|city2|0|-|null|none|ללא|כל הארץ|לקוח אונליין)$/i;

function cleanAddress(addr) {
  if (!addr) return '';
  return String(addr)
    // Strip parenthetical text, store notes, building specs (e.g. "יוחנן בן זכאי 9, בניין כלל" -> "יוחנן בן זכאי 9")
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/,.*$/, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCityCoords(city) {
  if (!city) return null;
  const rawCity = city.trim();
  if (ISRAEL_CITIES_COORDS[rawCity]) return ISRAEL_CITIES_COORDS[rawCity];
  const cleanCity = rawCity.replace(/['"״]/g, '').trim();
  for (const [key, coords] of Object.entries(ISRAEL_CITIES_COORDS)) {
    if (key.includes(cleanCity) || cleanCity.includes(key)) {
      return coords;
    }
  }
  return null;
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
  // Lake Kinneret
  if (lat >= 32.70 && lat <= 32.91 && lng >= 35.55 && lng <= 35.66) return 'Lake Kinneret';
  // Gulf of Eilat
  if (lat < 29.535 && lng >= 34.945 && lng <= 34.99) return 'Gulf of Eilat';
  // Mediterranean Sea coastline boundary
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

// Filter physical stores that need geocoding or validation
const physicalStores = allStores.filter(s => {
  const sid = String(s.id);
  if (!s.city || JUNK_CITY.test(String(s.city).trim())) return false;
  if (!s.address || String(s.address).trim() === '0' || String(s.address).trim() === '-') return false;
  if (targetCity && !s.city.includes(targetCity)) return false;

  if (force) return true;
  if (!geocodedMap[sid]) return true;

  // Re-verify existing entry against invariants (6km & water check)
  const existing = geocodedMap[sid];
  const center = resolveCityCoords(s.city);
  if (center) {
    const km = distanceKm(center.lat, center.lng, existing.lat, existing.lng);
    if (km > 6.0) return true; // Needs re-geocoding
  }
  if (isWater(existing.lat, existing.lng)) return true;

  return false;
});

console.log(`📍 Currently stored coordinates: ${Object.keys(geocodedMap).length}`);
console.log(`📋 Physical stores needing verified geocoding: ${physicalStores.length}`);

const batch = physicalStores.slice(0, limit);
console.log(`🚀 Processing batch of ${batch.length} stores...`);

function saveProgress() {
  fs.writeFileSync(geoFile, JSON.stringify(geocodedMap, null, 2), 'utf-8');
  if (fs.existsSync(publicDataDir)) {
    fs.copyFileSync(geoFile, path.join(publicDataDir, 'geocoded_locations.json'));
  }
}

async function geocodeOne(store) {
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
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'BehatsdaaGeocodingCLI/2.0' },
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

          // 1. Israel Bounding Box check
          if (lat < 29.3 || lat > 33.5 || lng < 34.1 || lng > 35.9) continue;

          // 2. Water body check
          if (isWater(lat, lng)) continue;

          // 3. City Center containment invariant (≤ 6.0 km)
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
      // try next query
    }
  }
  return null;
}

let addedCount = 0;
let failedCount = 0;

for (let i = 0; i < batch.length; i++) {
  const store = batch[i];
  const coords = await geocodeOne(store);
  if (coords) {
    geocodedMap[String(store.id)] = coords;
    addedCount++;
  } else {
    failedCount++;
  }

  if ((i + 1) % 25 === 0 || i === batch.length - 1) {
    saveProgress();
    console.log(`  Progress: ${i + 1}/${batch.length} processed (${addedCount} verified, ${failedCount} unresolved)`);
  }

  // Rate limiting delay
  await new Promise(r => setTimeout(r, 100));
}

saveProgress();
console.log(`✅ Batch complete! Verified: ${addedCount}, Unresolved: ${failedCount}. Total database: ${Object.keys(geocodedMap).length} stores.`);
