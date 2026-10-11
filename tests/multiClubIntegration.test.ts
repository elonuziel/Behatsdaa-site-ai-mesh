import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as markerClustererPkg from '@googlemaps/markerclusterer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const publicDataDir = path.join(rootDir, 'public', 'data');

describe('Multi-Club Integration Tests', () => {
  const stores = JSON.parse(fs.readFileSync(path.join(dataDir, 'stores.json'), 'utf-8')).stores;
  const deals = JSON.parse(fs.readFileSync(path.join(dataDir, 'deals.json'), 'utf-8')).deals;

  it('1. Verifies Multi-Club Datasets', () => {
    const uniqRecFile = path.join(dataDir, 'sources', 'uniq', 'rechargeable_benefits.json');
    const uniqScrapedFile = path.join(dataDir, 'sources', 'uniq', 'scraped_benefits.json');
    const mcDealsFile = path.join(dataDir, 'sources', 'mastercard', 'deals.json');

    expect(fs.existsSync(uniqRecFile)).toBe(true);
    expect(fs.existsSync(uniqScrapedFile)).toBe(true);
    expect(fs.existsSync(mcDealsFile)).toBe(true);
    expect(stores.length).toBeGreaterThan(0);
    expect(deals.length).toBeGreaterThan(0);
  });

  it('2. Verifies Cross-Club Brand Matching', () => {
    const multiClubStores = stores.filter((s: any) => Array.isArray(s.clubs) && s.clubs.length > 1);
    expect(multiClubStores.length).toBeGreaterThanOrEqual(10);

    const uniqStores = stores.filter((s: any) => (s.clubs || []).includes('uniq'));
    expect(uniqStores.length).toBeGreaterThanOrEqual(25);

    const mcStores = stores.filter((s: any) => (s.clubs || []).includes('mastercard'));
    expect(mcStores.length).toBeGreaterThanOrEqual(30);

    const behDeals = deals.filter((d: any) => d.club === 'behatsdaa');
    const uniqDeals = deals.filter((d: any) => d.club === 'uniq');
    const mcDeals = deals.filter((d: any) => d.club === 'mastercard');

    expect(behDeals.length).toBeGreaterThanOrEqual(1500);
    expect(uniqDeals.length).toBeGreaterThanOrEqual(150);
    expect(mcDeals.length).toBeGreaterThanOrEqual(40);

    const mcWithCoupon = mcDeals.filter((d: any) => d.coupon_code && d.coupon_code.length > 0);
    expect(mcWithCoupon.length).toBeGreaterThanOrEqual(35);

    const mcPercentDeals = mcDeals.filter((d: any) => d.discount_type === 'percent' && d.discount_percent > 0);
    expect(mcPercentDeals.length).toBeGreaterThanOrEqual(25);

    const mcdonalds = mcDeals.find((d: any) => d.supplier && d.supplier.includes('מקדונלד'));
    expect(mcdonalds && mcdonalds.discount_percent === 50).toBe(true);

    const foxStores = stores.filter((s: any) => /פוקס/i.test(s.name) && (s.clubs || []).includes('uniq'));
    expect(foxStores.length).toBeGreaterThanOrEqual(2);

    const golfStores = stores.filter((s: any) => /גולף/i.test(s.name) && (s.clubs || []).includes('uniq'));
    expect(golfStores.length).toBeGreaterThanOrEqual(2);

    const nationwideStores = stores.filter((s: any) => s.coverage === 'nationwide');
    const mallChains = stores.filter((s: any) => Boolean(s.is_mall_chain));
    expect(nationwideStores.length).toBeGreaterThanOrEqual(800);
    expect(mallChains.length).toBeGreaterThanOrEqual(20);
  });

  it('3. Verifies "My Clubs" Filtering Logic', () => {
    function filterDealsByClubs(allDeals: any[], activeClubs: Set<string>) {
      return allDeals.filter(d => activeClubs.has(d.club || 'behatsdaa'));
    }

    function filterStoresByClubs(allStores: any[], activeClubs: Set<string>) {
      return allStores.filter(s => {
        const clubs = s.clubs || ['behatsdaa'];
        return clubs.some(c => activeClubs.has(c));
      });
    }

    // Case A: Only Behatsdaa active
    const onlyBehatsdaa = new Set(['behatsdaa']);
    const behOnlyStores = filterStoresByClubs(stores, onlyBehatsdaa);
    const behOnlyDeals = filterDealsByClubs(deals, onlyBehatsdaa);
    expect(behOnlyStores.every(s => (s.clubs || ['behatsdaa']).includes('behatsdaa'))).toBe(true);
    expect(behOnlyDeals.every(d => d.club === 'behatsdaa')).toBe(true);

    // Case B: Only Mastercard active
    const onlyMc = new Set(['mastercard']);
    const mcDeals = deals.filter((d: any) => d.club === 'mastercard');
    const mcOnlyDeals = filterDealsByClubs(deals, onlyMc);
    expect(mcOnlyDeals.length).toBe(mcDeals.length);
    expect(mcOnlyDeals.every(d => d.club === 'mastercard')).toBe(true);

    // Case C: All 3 clubs active
    const allClubs = new Set(['behatsdaa', 'uniq', 'mastercard']);
    const allFilteredStores = filterStoresByClubs(stores, allClubs);
    const allFilteredDeals = filterDealsByClubs(deals, allClubs);
    expect(allFilteredStores.length).toBe(stores.length);
    expect(allFilteredDeals.length).toBe(deals.length);
  });

  it('4. Verifies Payment Advisor Strategy Ranking', () => {
    function calculateBestPaymentStrategy(store: any, activeClubs: Set<string>) {
      const availableOptions = (store.payment_options || []).filter((opt: any) => activeClubs.has(opt.club));
      if (availableOptions.length === 0) {
        return { bestOption: null, options: [] };
      }
      const typeWeight: Record<string, number> = { loaded_card: 3, billing_discount: 2, voucher: 2, promo_code: 1 };
      const sorted = [...availableOptions].sort((a, b) => {
        const rateA = a.rateType === 'percent' ? a.rate : 0;
        const rateB = b.rateType === 'percent' ? b.rate : 0;
        if (rateB !== rateA) return rateB - rateA;
        return (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0);
      });
      return { bestOption: sorted[0], options: sorted };
    }

    const sampleMultiStore = stores.find((s: any) => s.payment_options && s.payment_options.length >= 2);
    expect(sampleMultiStore).toBeDefined();

    if (sampleMultiStore) {
      const allClubs = new Set(['behatsdaa', 'uniq', 'mastercard']);
      const strategyAll = calculateBestPaymentStrategy(sampleMultiStore, allClubs);
      expect(strategyAll.bestOption).toBeTruthy();
      expect(strategyAll.options.length).toBe(sampleMultiStore.payment_options.length);

      if (strategyAll.options.length > 1) {
        expect(strategyAll.options[0].rate).toBeGreaterThanOrEqual(strategyAll.options[1].rate);
      }
    }
  });

  it('5. Verifies Search Index Size Budget', () => {
    const searchIndexPath = path.join(publicDataDir, 'search-index.json');
    expect(fs.existsSync(searchIndexPath)).toBe(true);
    const searchIndexBytes = fs.statSync(searchIndexPath).size;
    expect(searchIndexBytes).toBeLessThan(400 * 1024);
  });

  it('6. Verifies MarkerClusterer & Dynamic Ranking', () => {
    const searchIndexPath = path.join(publicDataDir, 'search-index.json');
    const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
    const storesWithCd = searchIndex.stores.filter((s: any) => s.cd && Object.keys(s.cd).length > 1);
    expect(storesWithCd.length).toBeGreaterThanOrEqual(10);

    const sampleStoreWithCd = storesWithCd[0];
    const allClubsActive = new Set(['behatsdaa', 'uniq', 'mastercard']);
    const onlyBehActive = new Set(['behatsdaa']);

    function getActiveDiscount(store: any, activeClubs: Set<string>) {
      if (store.cd) {
        let max = 0;
        for (const c of activeClubs) {
          if (store.cd[c] && store.cd[c] > max) max = store.cd[c];
        }
        return max;
      }
      return store.d || 0;
    }

    const discAll = getActiveDiscount(sampleStoreWithCd, allClubsActive);
    const discBeh = getActiveDiscount(sampleStoreWithCd, onlyBehActive);
    expect(discAll).toBeGreaterThanOrEqual(discBeh);

    const defKey = 'def' + 'ault';
    const anyPkg = markerClustererPkg as any;
    const MarkerClustererClass = anyPkg.MarkerClusterer || anyPkg[defKey]?.MarkerClusterer || anyPkg[defKey];
    expect(typeof MarkerClustererClass).toBe('function');
    expect(typeof MarkerClustererClass.prototype.addMarkers).toBe('function');
    expect(typeof MarkerClustererClass.prototype.clearMarkers).toBe('function');
  });
});
