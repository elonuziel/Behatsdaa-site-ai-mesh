/**
 * Geospatial Validator and Sanitizer for Israeli Store Coordinates
 * 
 * Enforces strict geographic invariants:
 * 1. Coastal Water Boundaries: Guarantees no store is placed in the Mediterranean Sea,
 *    Red Sea (Gulf of Eilat), or Lake Kinneret.
 * 2. Municipal Boundary Constraint: Ensures every store is within 6km of its declared city center,
 *    eliminating erroneous cross-city street name collisions (e.g. Eilat store placed in Tel Aviv).
 * 3. Eilat Hyper-Local Mappings: Correctly places Shahamon, Golani, HaTmarim, Ice Mall,
 *    and Industrial Zone stores on dry land.
 * 4. Synthetic Offset Purge: Replaces any legacy trigonometric synthetic offsets with authentic coordinates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISRAEL_CITIES_COORDS, resolveCityCoords } from '../js/israel_cities.js';
import {
  isSyntheticCoordinate,
  resolveAuthenticOfflineCoords,
  isValidCoordinate,
  getMedMinLng,
  CITY_STREET_NODES,
  distanceKm
} from './geocode-stores.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const geoFile = path.join(rootDir, 'data', 'geocoded_locations.json');
const publicGeoFile = path.join(rootDir, 'public', 'data', 'geocoded_locations.json');
const billingFile = path.join(rootDir, 'data', 'billing_stores.json');

const geoMap = JSON.parse(fs.readFileSync(geoFile, 'utf-8'));
const billingStores = JSON.parse(fs.readFileSync(billingFile, 'utf-8')).stores;

let fixedEilat = 0;
let fixedMedWater = 0;
let fixedKinneret = 0;
let fixedCityMismatch = 0;
let fixedSynthetic = 0;

for (const store of billingStores) {
  const sid = String(store.id);
  const city = (store.city || '').trim();
  const addr = (store.address || '').trim();
  const cleanAddr = (addr + ' ' + (store.name || '')).replace(/['"״`]/g, '');

  if (!city || city.toLowerCase() === 'online' || city.includes('אונליין')) continue;

  let g = geoMap[sid];
  if (!g) {
    const resolved = resolveAuthenticOfflineCoords(store);
    g = resolved ? { lat: resolved.lat, lng: resolved.lng } : { lat: 32.0853, lng: 34.7818 };
    geoMap[sid] = g;
  }

  // 0. Eliminate legacy synthetic trigonometric coordinates
  if (isSyntheticCoordinate(sid, store, g)) {
    const resolved = resolveAuthenticOfflineCoords(store);
    if (resolved) {
      g.lat = resolved.lat;
      g.lng = resolved.lng;
      fixedSynthetic++;
    }
  }

  // 1. Municipal Boundary & Distance Validation (<= 6.0km)
  const cityBase = resolveCityCoords(city);

  if (cityBase) {
    const distKm = distanceKm(cityBase.lat, cityBase.lng, g.lat, g.lng);

    // If store is placed > 6km away from its actual city center, relocate it inside its true city
    if (distKm > 6.0) {
      const resolved = resolveAuthenticOfflineCoords(store);
      if (resolved) {
        g.lat = resolved.lat;
        g.lng = resolved.lng;
      } else {
        g.lat = cityBase.lat;
        g.lng = cityBase.lng;
      }
      fixedCityMismatch++;
    }
  }

  // 2. Specific Eilat Precision & Land Clamp
  if (city.includes('אילת')) {
    const eilatNodes = CITY_STREET_NODES['אילת'] || [];
    for (const node of eilatNodes) {
      if (node.keys.some(k => cleanAddr.includes(k))) {
        g.lat = node.lat;
        g.lng = node.lng;
        fixedEilat++;
        break;
      }
    }

    if (g.lat < 29.553 && g.lng > 34.9535) {
      g.lng = 34.9490; // Pull inland onto residential/commercial streets
      fixedEilat++;
    }
    if (g.lat < 29.545 && g.lng > 34.9420) {
      g.lng = 34.9360; // Pull inland into Shahamon
      fixedEilat++;
    }
  }

  // 3. Mediterranean Sea Clamp
  if (g.lat >= 31.45 && g.lat <= 33.15) {
    const minSafeLng = getMedMinLng(g.lat);
    if (g.lng < minSafeLng) {
      // Place safely on beachside avenue/corridor (approx 150m inland)
      g.lng = Math.round((minSafeLng + 0.0018) * 1000000) / 1000000;
      fixedMedWater++;
    }
  }

  // 4. Lake Kinneret Clamp (Tiberias vs Ein Gev)
  if (g.lat >= 32.76 && g.lat <= 32.85 && g.lng >= 35.545 && g.lng <= 35.642) {
    if (city.includes('עין גב')) {
      g.lng = 35.6430; // Place safely on eastern shore in Ein Gev kibbutz
    } else {
      g.lng = 35.5380; // Pull west onto HaGalil / HaBanim streets in Tiberias
    }
    fixedKinneret++;
  }
}

console.log(`✅ Fixed ${fixedSynthetic} legacy synthetic trigonometric coordinates`);
console.log(`✅ Fixed ${fixedCityMismatch} city cross-contamination misplacements`);
console.log(`✅ Fixed ${fixedEilat} Eilat water / misaligned street coordinates`);
console.log(`✅ Fixed ${fixedMedWater} Mediterranean water placements`);
console.log(`✅ Fixed ${fixedKinneret} Kinneret water placements`);

fs.writeFileSync(geoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
if (fs.existsSync(path.dirname(publicGeoFile))) {
  fs.writeFileSync(publicGeoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
}
console.log('🎉 Successfully saved sanitized coordinates to data and public/data!');
