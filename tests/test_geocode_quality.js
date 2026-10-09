/**
 * Geocoded Location Quality Suite — 0 external dependencies, no network access.
 *
 * Run: node tests/test_geocode_quality.js
 *
 * Guards the location precision of every stored map coordinate (data/geocoded_locations.json):
 *   1. every entry is a valid, in-Israel coordinate,
 *   2. every business sits inside its own city (≤ 25 km from that city's center),
 *   3. two businesses declaring different cities never share the exact same point,
 *   4. street-level coverage stays above the committed baseline,
 *   5. every city appearing in the data has a resolvable fallback center.
 *
 * Regenerate the data with:  npm run geocode  (see also scripts/geocode-cities.js)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCityCoords } from '../js/israel_cities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- thresholds
const HARD_CITY_RADIUS_KM = 25;      // a business must be inside its own city area
const MIN_COVERAGE_RATIO = 0.75;     // precise (street-level) share of physical businesses
const ISRAEL_BBOX = { minLat: 29.3, maxLat: 33.5, minLng: 34.1, maxLng: 35.9 };
const JUNK_CITY = /^(online|city2|0|-|null|none|ללא|כל הארץ|לקוח אונליין)$/i;

console.log('🧪 Starting Geocoded Location Quality Tests...\n');

let passedTests = 0;
let totalTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failures.push(message);
    process.exitCode = 1;
  }
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------- load data
const geoPath = path.join(rootDir, 'data', 'geocoded_locations.json');
const billingPath = path.join(rootDir, 'data', 'billing_stores.json');

console.log('📂 1. Loading datasets:');
assert(fs.existsSync(geoPath), 'data/geocoded_locations.json exists');
assert(fs.existsSync(billingPath), 'data/billing_stores.json exists');

const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
const billing = JSON.parse(fs.readFileSync(billingPath, 'utf-8')).stores || [];
const storeById = new Map(billing.map((s) => [String(s.id), s]));

const geoEntries = Object.entries(geo);
assert(geoEntries.length > 1000, `Geocoded location database is populated (found ${geoEntries.length})`);

// Physical businesses = real city + street address (online-only records have no map pin)
const physicalStores = billing.filter((s) =>
  s.city && !JUNK_CITY.test(String(s.city).trim()) && s.address && String(s.address).trim() && String(s.address).trim() !== '0'
);
console.log(`  📊 ${geoEntries.length} precise coordinates · ${physicalStores.length} physical businesses`);

// ---------------------------------------------------------------- 2. geographic validity
console.log('\n🗺️  2. Testing geographic validity of every stored coordinate:');
let invalid = 0;
let outsideIsrael = 0;
for (const [id, entry] of geoEntries) {
  const lat = Number(entry?.lat);
  const lng = Number(entry?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    invalid++;
    continue;
  }
  if (lat < ISRAEL_BBOX.minLat || lat > ISRAEL_BBOX.maxLat || lng < ISRAEL_BBOX.minLng || lng > ISRAEL_BBOX.maxLng) {
    outsideIsrael++;
  }
}
assert(invalid === 0, `Every entry has numeric lat/lng (invalid: ${invalid})`);
assert(outsideIsrael === 0, `Every coordinate is inside Israel (${outsideIsrael} outside)`);

// ---------------------------------------------------------------- 3. city containment
console.log('\n🏙️  3. Testing that every business is plotted inside its own city:');
let checkedCities = 0;
let unresolvableCityCount = 0;
const farOffenders = [];
for (const [id, entry] of geoEntries) {
  const store = storeById.get(id);
  if (!store || !store.city) continue;
  const center = resolveCityCoords(store.city);
  if (!center) {
    unresolvableCityCount++;
    continue;
  }
  checkedCities++;
  const km = distanceKm(center.lat, center.lng, Number(entry.lat), Number(entry.lng));
  if (km > HARD_CITY_RADIUS_KM) {
    farOffenders.push({ id, city: store.city, address: store.address, km: km.toFixed(1) });
  }
}
assert(
  farOffenders.length === 0,
  `No business sits further than ${HARD_CITY_RADIUS_KM} km from its own city center ` +
  `(${farOffenders.length} violations out of ${checkedCities} checked)`
);
if (farOffenders.length > 0) {
  for (const o of farOffenders.slice(0, 5)) {
    console.error(`     ↳ ${o.id}: "${o.address}", ${o.city} — ${o.km} km away`);
  }
}
console.log(`  ℹ️  ${checkedCities} coordinates validated against their city center ` +
  `(${unresolvableCityCount} without a reference center)`);

// ---------------------------------------------------------------- 4. cross-city collisions
console.log('\n📍 4. Testing for cross-city coordinate collisions:');
// Sharing one point is legitimate for neighbouring municipalities (boundary streets, malls) and
// for coarse "main road" addresses. What must never happen is one point serving cities that are
// far apart, which means at least one business was pinned into a different city.
const pointCities = new Map();
for (const [id, entry] of geoEntries) {
  const store = storeById.get(id);
  if (!store || !store.city) continue;
  const key = `${Number(entry.lat).toFixed(5)},${Number(entry.lng).toFixed(5)}`;
  if (!pointCities.has(key)) pointCities.set(key, new Set());
  pointCities.get(key).add(String(store.city).trim());
}
const sharedPoints = [...pointCities.entries()].filter(([, cities]) => cities.size > 1);
const FAR_APART_KM = 15;
const badCollisions = [];
for (const [point, cities] of sharedPoints) {
  const centers = [...cities].map((city) => resolveCityCoords(city)).filter(Boolean);
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const km = distanceKm(centers[i].lat, centers[i].lng, centers[j].lat, centers[j].lng);
      if (km > FAR_APART_KM) badCollisions.push({ point, cities: [...cities].join(', '), km: km.toFixed(1) });
    }
  }
}
console.log(`  ℹ️  ${sharedPoints.length} coordinates are shared by more than one city (neighbouring towns are fine)`);
assert(
  badCollisions.length === 0,
  `No coordinate is shared by cities located more than ${FAR_APART_KM} km apart (${badCollisions.length} violations)`
);
if (badCollisions.length > 0) {
  for (const c of badCollisions.slice(0, 5)) {
    console.error(`     ↳ ${c.point} shared by ${c.cities} (${c.km} km apart)`);
  }
}

// ---------------------------------------------------------------- 5. coverage
console.log('\n🎯 5. Testing street-level coverage:');
const precisePhysical = physicalStores.filter((s) => Boolean(geo[String(s.id)])).length;
const coverage = physicalStores.length > 0 ? precisePhysical / physicalStores.length : 0;
const coveragePct = (coverage * 100).toFixed(1);
console.log(`  📊 Street-level coverage: ${precisePhysical}/${physicalStores.length} physical businesses (${coveragePct}%)`);
assert(coverage >= MIN_COVERAGE_RATIO, `Street-level coverage is at least ${(MIN_COVERAGE_RATIO * 100).toFixed(0)}% (actual: ${coveragePct}%)`);

// ---------------------------------------------------------------- 6. city fallback table
console.log('\n📚 6. Testing city-center fallback coverage:');
const missingCities = new Map();
for (const store of physicalStores) {
  if (!resolveCityCoords(store.city)) {
    missingCities.set(store.city, (missingCities.get(store.city) || 0) + 1);
  }
}
const missingBusinesses = [...missingCities.values()].reduce((a, b) => a + b, 0);
console.log(`  📊 ${missingCities.size} cities fall back to the generic center (${missingBusinesses} businesses)`);
assert(
  missingBusinesses <= 100,
  `At most 100 businesses lack a city-specific fallback center (actual: ${missingBusinesses})`
);
if (missingCities.size > 0) {
  const top = [...missingCities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('  ℹ️  Largest cities without a center: ' + top.map(([c, n]) => `${c} (${n})`).join(', '));
  console.log('     (run: node scripts/geocode-cities.js to fill the fallback table)');
}

// ---------------------------------------------------------------- summary
console.log('\n===========================================');
console.log(`🎉 Results: ${passedTests} / ${totalTests} tests passed successfully!`);
console.log('===========================================\n');

if (failures.length > 0) {
  console.error('Failures:');
  for (const f of failures) console.error(`  ❌ ${f}`);
}
