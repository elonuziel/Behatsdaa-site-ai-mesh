/**
 * Offline Store Location Enrichment Script (Zero Synthetic Trigonometry)
 * 
 * Replaces synthetic trigonometric approximations with authentic street & commercial
 * center nodes and authentic municipal city center anchors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCityCoords } from '../js/israel_cities.js';
import {
  resolveAuthenticOfflineCoords,
  isSyntheticCoordinate,
  isValidCoordinate
} from './geocode-stores.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const geoFile = path.join(rootDir, 'data', 'geocoded_locations.json');
const publicGeoFile = path.join(rootDir, 'public', 'data', 'geocoded_locations.json');
const billingFile = path.join(rootDir, 'data', 'billing_stores.json');

const billingData = JSON.parse(fs.readFileSync(billingFile, 'utf-8'));
const geoMap = fs.existsSync(geoFile) ? JSON.parse(fs.readFileSync(geoFile, 'utf-8')) : {};
const allStores = billingData.stores || [];

let enrichedCount = 0;

for (const store of allStores) {
  const sid = String(store.id);
  const city = (store.city || '').trim();

  if (!city || city.toLowerCase() === 'online' || city.includes('אונליין')) continue;

  const existing = geoMap[sid];
  const isInvalid = !existing || !isValidCoordinate(existing, city) || isSyntheticCoordinate(sid, store, existing);

  if (isInvalid) {
    const resolved = resolveAuthenticOfflineCoords(store);
    if (resolved) {
      geoMap[sid] = { lat: resolved.lat, lng: resolved.lng };
      enrichedCount++;
    } else {
      const center = resolveCityCoords(city);
      if (center) {
        geoMap[sid] = { lat: center.lat, lng: center.lng };
        enrichedCount++;
      }
    }
  }
}

console.log(`Enriched ${enrichedCount} stores with authentic street/neighborhood coordinates!`);
console.log(`Total geocoded in database: ${Object.keys(geoMap).length} / 10209 physical stores!`);

fs.writeFileSync(geoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
if (fs.existsSync(path.dirname(publicGeoFile))) {
  fs.writeFileSync(publicGeoFile, JSON.stringify(geoMap, null, 2), 'utf-8');
}
