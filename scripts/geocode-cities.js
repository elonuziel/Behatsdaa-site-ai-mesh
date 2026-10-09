import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISRAEL_CITIES_COORDS, resolveCityCoords } from '../js/israel_cities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const billingPath = path.join(rootDir, 'data', 'billing_stores.json');
const billing = JSON.parse(fs.readFileSync(billingPath, 'utf-8')).stores || [];

const JUNK_CITY = /^(online|city2|0|-|null|none|ללא|כל הארץ|לקוח אונליין)$/i;
const physicalStores = billing.filter((s) =>
  s.city && !JUNK_CITY.test(String(s.city).trim()) && s.address && String(s.address).trim() && String(s.address).trim() !== '0'
);

const missingCities = new Map();
for (const store of physicalStores) {
  const city = store.city.trim();
  if (!resolveCityCoords(city)) {
    missingCities.set(city, (missingCities.get(city) || 0) + 1);
  }
}

const sorted = [...missingCities.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Found ${sorted.length} missing cities (${[...missingCities.values()].reduce((a, b) => a + b, 0)} businesses).`);

async function fetchCoords(cityName) {
  const clean = cityName.replace(/['"״]/g, '').trim();
  const queries = [
    `${clean} ישראל`,
    `יישוב ${clean} ישראל`,
    `קיבוץ ${clean} ישראל`,
    `מושב ${clean} ישראל`
  ];

  for (const q of queries) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'BehatsdaaGeocoding/1.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      const coords = data?.features?.[0]?.geometry?.coordinates;
      if (coords) {
        const lng = coords[0];
        const lat = coords[1];
        if (lat >= 29.4 && lat <= 33.4 && lng >= 34.2 && lng <= 35.9) {
          return { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 };
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

const resolved = {};
for (const [city, count] of sorted) {
  const coords = await fetchCoords(city);
  if (coords) {
    resolved[city] = coords;
    console.log(`  ✅ ${city} (${count} stores) ->`, coords);
  } else {
    console.log(`  ❌ Could not resolve: ${city}`);
  }
  await new Promise(r => setTimeout(r, 60));
}

console.log(`Successfully resolved ${Object.keys(resolved).length} cities!`);
fs.writeFileSync(path.join(rootDir, 'data', 'resolved_cities.json'), JSON.stringify(resolved, null, 2), 'utf-8');

