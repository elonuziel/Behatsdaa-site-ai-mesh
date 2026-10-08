/**
 * Automated Geocoding Utility for Max Billing Stores
 * 
 * Usage:
 *   npm run geocode                    # Geocodes next batch of un-geocoded stores
 *   node scripts/geocode-stores.js --city "תל אביב"
 *   node scripts/geocode-stores.js --limit 500
 * 
 * Progress is saved incrementally so it can be resumed at any time.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
let limit = 200;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--city' && args[i + 1]) targetCity = args[i + 1];
  if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
}

function cleanAddress(addr) {
  if (!addr) return '';
  return addr
    .replace(/[\(\),].*$/, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Filter stores that need geocoding
const pendingStores = allStores.filter(s => {
  const sid = String(s.id);
  if (geocodedMap[sid]) return false;
  if (!s.city || s.city.toLowerCase() === 'online' || s.city.includes('אונליין')) return false;
  if (!s.address) return false;
  if (targetCity && !s.city.includes(targetCity)) return false;
  return true;
});

console.log(`📍 Already geocoded: ${Object.keys(geocodedMap).length} stores`);
console.log(`📋 Pending stores to geocode: ${pendingStores.length}`);

const batch = pendingStores.slice(0, limit);
console.log(`🚀 Processing batch of ${batch.length} stores...`);

function saveProgress() {
  fs.writeFileSync(geoFile, JSON.stringify(geocodedMap, null, 2), 'utf-8');
  if (fs.existsSync(publicDataDir)) {
    fs.copyFileSync(geoFile, path.join(publicDataDir, 'geocoded_locations.json'));
  }
}

async function geocodeOne(store) {
  const sid = String(store.id);
  const cleanAddr = cleanAddress(store.address);
  const queries = [
    `${cleanAddr} ${store.city} ישראל`,
    `${store.address} ${store.city} ישראל`,
    `${cleanAddr} ${store.city}`
  ];

  for (const q of queries) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'BehatsdaaGeocodingCLI/2.0' },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (coords) {
          const lng = coords[0];
          const lat = coords[1];
          if (lat > 29.3 && lat < 33.5 && lng > 34.1 && lng < 35.9) {
            return { lat: Math.round(lat * 1000000) / 1000000, lng: Math.round(lng * 1000000) / 1000000 };
          }
        }
      }
    } catch (e) {
      // try next query
    }
  }
  return null;
}

let addedCount = 0;
for (let i = 0; i < batch.length; i++) {
  const store = batch[i];
  const coords = await geocodeOne(store);
  if (coords) {
    geocodedMap[String(store.id)] = coords;
    addedCount++;
  }

  if ((i + 1) % 25 === 0 || i === batch.length - 1) {
    saveProgress();
    console.log(`  Progress: ${i + 1}/${batch.length} processed (${addedCount} newly geocoded)`);
  }

  // Gentle delay to avoid rate-limiting
  await new Promise(r => setTimeout(r, 120));
}

saveProgress();
console.log(`✅ Geocoding completed! Newly geocoded: ${addedCount}. Total database: ${Object.keys(geocodedMap).length} stores.`);
