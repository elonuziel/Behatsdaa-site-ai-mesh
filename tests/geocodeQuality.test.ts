import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCityCoords } from '../src/utils/israelCities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HARD_CITY_RADIUS_KM = 25;
const MIN_COVERAGE_RATIO = 0.75;
const ISRAEL_BBOX = { minLat: 29.3, maxLat: 33.5, minLng: 34.1, maxLng: 35.9 };
const JUNK_CITY = /^(online|city2|0|-|null|none|ללא|כל הארץ|לקוח אונליין)$/i;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

describe('Geocoded Location Quality Suite', () => {
  const geoPath = path.join(rootDir, 'data', 'geocoded_locations.json');
  const billingPath = path.join(rootDir, 'data', 'billing_stores.json');

  it('1. Loading datasets', () => {
    expect(fs.existsSync(geoPath)).toBe(true);
    expect(fs.existsSync(billingPath)).toBe(true);

    const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
    const geoEntries = Object.entries(geo);
    expect(geoEntries.length).toBeGreaterThan(1000);
  });

  it('2. Geographic validity of every stored coordinate', () => {
    const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
    const geoEntries = Object.entries(geo);

    let invalid = 0;
    let outsideIsrael = 0;
    for (const [, entry] of geoEntries) {
      const anyEntry = entry as { lat?: number; lng?: number };
      const lat = Number(anyEntry?.lat);
      const lng = Number(anyEntry?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        invalid++;
        continue;
      }
      if (lat < ISRAEL_BBOX.minLat || lat > ISRAEL_BBOX.maxLat || lng < ISRAEL_BBOX.minLng || lng > ISRAEL_BBOX.maxLng) {
        outsideIsrael++;
      }
    }
    expect(invalid).toBe(0);
    expect(outsideIsrael).toBe(0);
  });

  it('3. City containment: business within 25km of city center', () => {
    const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
    const billing = JSON.parse(fs.readFileSync(billingPath, 'utf-8')).stores || [];
    const storeById = new Map(billing.map((s: any) => [String(s.id), s]));
    const geoEntries = Object.entries(geo);

    const farOffenders: any[] = [];
    for (const [id, entry] of geoEntries) {
      const store: any = storeById.get(id);
      if (!store || !store.city) continue;
      const center = resolveCityCoords(store.city);
      if (!center) continue;
      const anyEntry = entry as { lat: number; lng: number };
      const km = distanceKm(center.lat, center.lng, Number(anyEntry.lat), Number(anyEntry.lng));
      if (km > HARD_CITY_RADIUS_KM) {
        farOffenders.push({ id, city: store.city, address: store.address, km: km.toFixed(1) });
      }
    }
    expect(farOffenders.length).toBe(0);
  });

  it('4. Street-level coverage exceeds baseline', () => {
    const geo = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
    const billing = JSON.parse(fs.readFileSync(billingPath, 'utf-8')).stores || [];
    const geoEntries = Object.entries(geo);

    const physicalStores = billing.filter((s: any) =>
      s.city && !JUNK_CITY.test(String(s.city).trim()) && s.address && String(s.address).trim() && String(s.address).trim() !== '0'
    );
    const coverage = geoEntries.length / physicalStores.length;
    expect(coverage).toBeGreaterThanOrEqual(MIN_COVERAGE_RATIO);
  });
});
