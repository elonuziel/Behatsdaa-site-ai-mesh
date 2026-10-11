import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MiniSearch from 'minisearch';
import { fetchJsonWithFallback } from '../src/utils/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDataDir = path.join(rootDir, 'public', 'data');
const publicStoresDir = path.join(publicDataDir, 'stores');
const publicDealsDir = path.join(publicDataDir, 'deals');

describe('Data Integrity & Performance Verification Suite', () => {
  const rawStoresData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'stores.json'), 'utf-8'));
  const rawDealsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'deals.json'), 'utf-8'));
  const expectedStoreCount = rawStoresData.stores?.length || 0;
  const expectedDealCount = rawDealsData.deals?.length || 0;

  it('1. Static API Layout & File Size Budgets', () => {
    const searchIndexPath = path.join(publicDataDir, 'search-index.json');
    expect(fs.existsSync(searchIndexPath)).toBe(true);

    const searchIndexBytes = fs.statSync(searchIndexPath).size;
    expect(searchIndexBytes).toBeLessThan(400 * 1024);

    expect(expectedStoreCount).toBeGreaterThan(0);
    expect(expectedDealCount).toBeGreaterThan(0);

    const searchIndexData = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
    expect(searchIndexData.stores?.length).toBe(expectedStoreCount);
    expect(searchIndexData.deals?.length).toBe(expectedDealCount);
  });

  it('2. Dynamic Detailed Files in /public/data/', () => {
    const storeFiles = fs.readdirSync(publicStoresDir).filter(f => f.endsWith('.json'));
    expect(storeFiles.length).toBe(expectedStoreCount);

    const dealFiles = fs.readdirSync(publicDealsDir).filter(f => f.endsWith('.json'));
    expect(dealFiles.length).toBe(expectedDealCount);

    const sampleStore = JSON.parse(fs.readFileSync(path.join(publicStoresDir, storeFiles[0]), 'utf-8'));
    expect(Boolean(sampleStore.id && sampleStore.name && sampleStore.slug)).toBe(true);
  });

  it('3. Pre-Computed Cross-Linking', () => {
    const storesData = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'stores.json'), 'utf-8'));
    const dealsData = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'deals.json'), 'utf-8'));
    const billingData = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'billing_stores.json'), 'utf-8'));

    const storesWithDeals = storesData.stores.filter((s: any) => s.linked_deals && s.linked_deals.length > 0);
    expect(storesWithDeals.length).toBeGreaterThan(0);

    const storesWithBilling = storesData.stores.filter((s: any) => s.linked_billing);
    expect(storesWithBilling.length).toBeGreaterThan(0);

    const billingWithStores = billingData.stores.filter((b: any) => b.linked_store);
    expect(billingWithStores.length).toBeGreaterThan(0);

    const billingIndexData = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'billing-index.json'), 'utf-8'));
    expect(billingIndexData.stores.every((b: any) => Boolean(b.full_address))).toBe(true);
  });

  it('4. Wallets Terms, Caps & Store Count Metadata', () => {
    const walletsInfoPath = path.join(publicDataDir, 'wallets_info.json');
    expect(fs.existsSync(walletsInfoPath)).toBe(true);

    const walletsInfoData = JSON.parse(fs.readFileSync(walletsInfoPath, 'utf-8'));
    expect(walletsInfoData.wallets?.length).toBe(6);
    expect(walletsInfoData.metadata?.general_caps?.monthly_cap_general).toBe(3000);
    expect(walletsInfoData.metadata?.general_caps?.monthly_cap_fighter).toBe(2500);
    expect(walletsInfoData.metadata?.general_caps?.instant_balance_cap).toBe(1000);
    expect(walletsInfoData.metadata?.general_caps?.min_reload).toBe(100);
    expect(walletsInfoData.wallets.every((w: any) => typeof w.stores_count === 'number' && w.stores_count > 0)).toBe(true);
  });

  it('5. MiniSearch Speed Across Billing items', () => {
    function normalizeHebrew(text: string) {
      if (!text) return '';
      return String(text)
        .toLowerCase()
        .replace(/[\u0591-\u05C7]/g, '')
        .replace(/ך/g, 'כ')
        .replace(/ם/g, 'מ')
        .replace(/ן/g, 'נ')
        .replace(/ף/g, 'פ')
        .replace(/ץ/g, 'צ')
        .replace(/["'״׳\-–_.,()/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const billingIndex = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'billing-index.json'), 'utf-8'));
    const ms = new MiniSearch({
      fields: ['n', 'c', 'cat', 'fa'],
      storeFields: ['id'],
      processTerm: (term) => normalizeHebrew(term),
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { n: 3, c: 2, cat: 1.5 },
      },
    });

    const indexItems = billingIndex.stores.map((b: any) => ({
      id: b.id,
      n: b.name,
      c: b.city || '',
      cat: b.category || '',
      fa: b.full_address || '',
    }));

    ms.addAll(indexItems);

    const testQueries = ['פיצה', 'תל אביב', 'ספורט', 'קפה', 'ירושלים', 'בגדים', 'דלתא', 'מקדונלדס'];
    const latencies: number[] = [];

    for (const q of testQueries) {
      const start = performance.now();
      ms.search(q);
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    expect(avgLatency).toBeLessThan(12);
  });

  it('6. Memory Profile', () => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024);
    expect(heapUsedMB).toBeLessThan(150);
  });

  it('7. fetchJsonWithFallback Utility & Fallback Logic', async () => {
    const originalFetch = global.fetch;

    // Case 1: HTTP OK
    global.fetch = (async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })) as any;

    const successRes = await fetchJsonWithFallback('data/test.json', { success: false }, 'Test Success');
    expect(successRes && successRes.success).toBe(true);

    // Case 2: HTTP error (404)
    global.fetch = (async () => ({
      ok: false,
      status: 404,
    })) as any;
    const fallbackHttpRes = await fetchJsonWithFallback('data/missing.json', { fallback: true }, null);
    expect(fallbackHttpRes && fallbackHttpRes.fallback).toBe(true);

    // Case 3: Network exception
    global.fetch = (async () => {
      throw new Error('Network offline');
    }) as any;
    const fallbackNetRes = await fetchJsonWithFallback('data/missing.json', { fallback: true }, null);
    expect(fallbackNetRes && fallbackNetRes.fallback).toBe(true);

    // Restore fetch
    global.fetch = originalFetch;
  });
});
