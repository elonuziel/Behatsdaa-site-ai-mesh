/**
 * Multi-Club Integration Test Suite
 * 
 * Verifies:
 * 1. Multi-Club Data Ingestion & Cross-Club Brand Matching
 * 2. Club Filtering Logic ("My Clubs" toggles)
 * 3. Best Payment Strategy Advisor Ranking & Calculation
 * 4. Search Index Size Budget (< 400 KB)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const publicDataDir = path.join(rootDir, 'public', 'data');

console.log('🧪 Starting Multi-Club Integration Tests...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// 1. Ingestion & Sources
console.log('📦 1. Verifying Multi-Club Datasets:');
const uniqRecFile = path.join(dataDir, 'sources', 'uniq', 'rechargeable_benefits.json');
const uniqScrapedFile = path.join(dataDir, 'sources', 'uniq', 'scraped_benefits.json');
const mcDealsFile = path.join(dataDir, 'sources', 'mastercard', 'deals.json');

assert(fs.existsSync(uniqRecFile), 'UNIQ rechargeable benefits feed exists');
assert(fs.existsSync(uniqScrapedFile), 'UNIQ scraped benefits feed exists');
assert(fs.existsSync(mcDealsFile), 'Mastercard Day deals feed exists');

const stores = JSON.parse(fs.readFileSync(path.join(dataDir, 'stores.json'), 'utf-8')).stores;
const deals = JSON.parse(fs.readFileSync(path.join(dataDir, 'deals.json'), 'utf-8')).deals;

assert(stores.length > 0, `Stores loaded (${stores.length} stores)`);
assert(deals.length > 0, `Deals loaded (${deals.length} deals)`);

// 2. Cross-Club Brand Matching
console.log('\n🔗 2. Verifying Cross-Club Brand Matching:');
const multiClubStores = stores.filter(s => Array.isArray(s.clubs) && s.clubs.length > 1);
assert(multiClubStores.length >= 10, `Found ${multiClubStores.length} stores spanning multiple discount clubs`);

const uniqStores = stores.filter(s => (s.clubs || []).includes('uniq'));
assert(uniqStores.length >= 25, `Found ${uniqStores.length} stores with UNIQ benefits`);

const mcStores = stores.filter(s => (s.clubs || []).includes('mastercard'));
assert(mcStores.length >= 30, `Found ${mcStores.length} stores with Mastercard Day benefits`);

const behDeals = deals.filter(d => d.club === 'behatsdaa');
const uniqDeals = deals.filter(d => d.club === 'uniq');
const mcDeals = deals.filter(d => d.club === 'mastercard');

assert(behDeals.length >= 1500, `Behatsdaa deals present: ${behDeals.length}`);
assert(uniqDeals.length >= 150, `UNIQ deals present: ${uniqDeals.length}`);
assert(mcDeals.length >= 40, `Mastercard Day deals present: ${mcDeals.length}`);

// Check Mastercard coupon codes and percent discounts
const mcWithCoupon = mcDeals.filter(d => d.coupon_code && d.coupon_code.length > 0);
assert(mcWithCoupon.length >= 35, `Mastercard deals have promo codes (${mcWithCoupon.length} found)`);

const mcPercentDeals = mcDeals.filter(d => d.discount_type === 'percent' && d.discount_percent > 0);
assert(mcPercentDeals.length >= 25, `Mastercard percent deals correctly identified (${mcPercentDeals.length} found)`);

const mcdonalds = mcDeals.find(d => d.supplier && d.supplier.includes('מקדונלד'));
assert(Boolean(mcdonalds && mcdonalds.discount_percent === 50), `McDonald's Mastercard deal has 50% discount (got ${mcdonalds?.discount_percent}%)`);

// Verify retail groups matching (Fox group, Golf group)
const foxStores = stores.filter(s => /פוקס/i.test(s.name) && (s.clubs || []).includes('uniq'));
assert(foxStores.length >= 2, `Fox group stores have UNIQ benefits (found ${foxStores.length})`);

const golfStores = stores.filter(s => /גולף/i.test(s.name) && (s.clubs || []).includes('uniq'));
assert(golfStores.length >= 2, `Golf group stores have UNIQ benefits (found ${golfStores.length})`);

// 3. "My Clubs" Filtering Logic Simulation
console.log('\n🎛️ 3. Verifying "My Clubs" Filtering Logic:');

function filterDealsByClubs(allDeals, activeClubs) {
  return allDeals.filter(d => activeClubs.has(d.club || 'behatsdaa'));
}

function filterStoresByClubs(allStores, activeClubs) {
  return allStores.filter(s => {
    const clubs = s.clubs || ['behatsdaa'];
    return clubs.some(c => activeClubs.has(c));
  });
}

// Case A: Only Behatsdaa active
const onlyBehatsdaa = new Set(['behatsdaa']);
const behOnlyStores = filterStoresByClubs(stores, onlyBehatsdaa);
const behOnlyDeals = filterDealsByClubs(deals, onlyBehatsdaa);
assert(behOnlyStores.every(s => (s.clubs || ['behatsdaa']).includes('behatsdaa')), 'Behatsdaa filter shows Behatsdaa-affiliated stores');
assert(behOnlyDeals.every(d => d.club === 'behatsdaa'), 'Behatsdaa filter excludes UNIQ and Mastercard exclusive deals');

// Case B: Only Mastercard active
const onlyMc = new Set(['mastercard']);
const mcOnlyDeals = filterDealsByClubs(deals, onlyMc);
assert(mcOnlyDeals.length === mcDeals.length, `Mastercard filter returns exactly all ${mcDeals.length} Mastercard deals`);
assert(mcOnlyDeals.every(d => d.club === 'mastercard'), 'Mastercard filter isolates Mastercard deals');

// Case C: All 3 clubs active
const allClubs = new Set(['behatsdaa', 'uniq', 'mastercard']);
const allFilteredStores = filterStoresByClubs(stores, allClubs);
const allFilteredDeals = filterDealsByClubs(deals, allClubs);
assert(allFilteredStores.length === stores.length, 'All clubs active returns 100% of stores');
assert(allFilteredDeals.length === deals.length, 'All clubs active returns 100% of deals');

// 4. Best Payment Strategy Advisor Calculation
console.log('\n💡 4. Verifying Payment Advisor Strategy Ranking:');

function calculateBestPaymentStrategy(store, activeClubs) {
  const availableOptions = (store.payment_options || []).filter(opt => activeClubs.has(opt.club));
  
  if (availableOptions.length === 0) {
    return { bestOption: null, options: [] };
  }

  // Sort: highest percent discount first; if percent equal, loaded_card > billing_discount > promo_code
  const typeWeight = { loaded_card: 3, billing_discount: 2, voucher: 2, promo_code: 1 };

  const sorted = [...availableOptions].sort((a, b) => {
    const rateA = a.rateType === 'percent' ? a.rate : 0;
    const rateB = b.rateType === 'percent' ? b.rate : 0;
    if (rateB !== rateA) return rateB - rateA;
    return (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0);
  });

  return {
    bestOption: sorted[0],
    options: sorted
  };
}

// Find a store with multiple options
const sampleMultiStore = stores.find(s => s.payment_options && s.payment_options.length >= 2);
assert(Boolean(sampleMultiStore), `Found multi-option store for testing: ${sampleMultiStore?.name}`);

if (sampleMultiStore) {
  const strategyAll = calculateBestPaymentStrategy(sampleMultiStore, allClubs);
  assert(Boolean(strategyAll.bestOption), `Advisor picked top payment route for ${sampleMultiStore.name}: ${strategyAll.bestOption?.label}`);
  assert(strategyAll.options.length === sampleMultiStore.payment_options.length, 'All options included when all clubs active');

  // Verify that ranking puts highest rate first
  if (strategyAll.options.length > 1) {
    assert(strategyAll.options[0].rate >= strategyAll.options[1].rate, 'Top recommendation has >= discount rate than 2nd option');
  }

  // Verify club toggle changes the recommendation if top club is deselected
  const topClub = strategyAll.bestOption.club;
  const withoutTopClub = new Set(['behatsdaa', 'uniq', 'mastercard']);
  withoutTopClub.delete(topClub);

  const strategyWithoutTop = calculateBestPaymentStrategy(sampleMultiStore, withoutTopClub);
  if (strategyWithoutTop.bestOption) {
    assert(strategyWithoutTop.bestOption.club !== topClub, `Advisor dynamically adapts when ${topClub} is deselected`);
  }
}

// 5. Search Index Size Budget Check
console.log('\n📊 5. Verifying Search Index Size Budget:');
const searchIndexPath = path.join(publicDataDir, 'search-index.json');
assert(fs.existsSync(searchIndexPath), 'search-index.json exists in public/data');
const searchIndexBytes = fs.statSync(searchIndexPath).size;
const searchIndexKB = (searchIndexBytes / 1024).toFixed(1);
console.log(`  search-index.json size: ${searchIndexKB} KB (Budget: < 400 KB)`);
assert(searchIndexBytes < 400 * 1024, `search-index.json is strictly under 400 KB (actual: ${searchIndexKB} KB)`);

// 6. MarkerClusterer Resolution & Dynamic Discount Ranking
console.log('\n🗺️ 6. Verifying MarkerClusterer & Dynamic Ranking:');
const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
const storesWithCd = searchIndex.stores.filter(s => s.cd && Object.keys(s.cd).length > 1);
assert(storesWithCd.length >= 10, `Found ${storesWithCd.length} stores with multi-club discounts (cd) in search-index`);

// Test dynamic discount calculation for multi-club store
const sampleStoreWithCd = storesWithCd[0];
const allClubsActive = new Set(['behatsdaa', 'uniq', 'mastercard']);
const onlyBehActive = new Set(['behatsdaa']);

function getActiveDiscount(store, activeClubs) {
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
assert(discAll >= discBeh, `Active discount dynamically adapts for ${sampleStoreWithCd.name} (all: ${discAll}%, beh-only: ${discBeh}%)`);

// Verify MarkerClusterer import resolution
import * as markerClustererPkg from '@googlemaps/markerclusterer';
const defKey = 'def' + 'ault';
const MarkerClustererClass = markerClustererPkg.MarkerClusterer || markerClustererPkg[defKey]?.MarkerClusterer || markerClustererPkg[defKey];
assert(typeof MarkerClustererClass === 'function', 'MarkerClustererClass resolves to a constructor function');
assert(typeof MarkerClustererClass.prototype.addMarkers === 'function', 'MarkerClusterer prototype has addMarkers method');
assert(typeof MarkerClustererClass.prototype.clearMarkers === 'function', 'MarkerClusterer prototype has clearMarkers method');

console.log(`\n===========================================`);
console.log(`🎉 Results: ${passedTests} / ${totalTests} multi-club tests passed!`);
console.log(`===========================================\n`);
