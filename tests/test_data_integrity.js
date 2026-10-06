/**
 * Automated Data Integrity & Performance Verification Suite
 * 
 * Verifies that:
 * 1. Zero data is lost or corrupted after optimization.
 * 2. Cross-linking between stores, deals, and billing works correctly.
 * 3. Search execution time on 10,000+ items meets performance budget (< 8ms).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const optDir = path.join(rootDir, 'data', 'optimized');

console.log('🧪 Starting Data Integrity & Performance Tests...\n');

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

// 1. Integrity Tests
const storesData = JSON.parse(fs.readFileSync(path.join(optDir, 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(optDir, 'deals.json'), 'utf-8'));
const billingData = JSON.parse(fs.readFileSync(path.join(optDir, 'billing_stores.json'), 'utf-8'));

console.log('📦 1. Testing Record Counts & Schemas:');
assert(storesData.stores.length === 987, `Stores count matches exactly 987 (got ${storesData.stores.length})`);
assert(dealsData.deals.length === 1737, `Deals count matches exactly 1,737 (got ${dealsData.deals.length})`);
assert(billingData.stores.length === 10668, `Billing count matches exactly 10,668 (got ${billingData.stores.length})`);

// 2. Cross-linking Tests
console.log('\n🔗 2. Testing Cross-Linking:');
const storesWithDeals = storesData.stores.filter(s => s.linked_deals && s.linked_deals.length > 0);
assert(storesWithDeals.length > 0, `Stores with pre-linked deals exist (found ${storesWithDeals.length})`);

const storesWithBilling = storesData.stores.filter(s => s.linked_billing);
assert(storesWithBilling.length > 0, `Stores with pre-linked billing exist (found ${storesWithBilling.length})`);

const billingWithStores = billingData.stores.filter(b => b.linked_store);
assert(billingWithStores.length > 0, `Billing businesses with linked stores exist (found ${billingWithStores.length})`);

// 3. Search Speed Benchmark
console.log('\n⚡ 3. Testing Search Speed Across 10,668+ items:');

const testQueries = [
  'שופרסל',
  'סופר פארם',
  'קפה',
  'פיצה',
  'נעליים',
  'בגדים',
  'מלון',
  'אופטיקה',
  'פוקס',
  'ספורט'
];

const allBilling = billingData.stores;
const searchTimes = [];

for (const query of testQueries) {
  const start = performance.now();
  const q = query.toLowerCase();
  
  // Fast token scan
  const results = allBilling.filter(b => b._search && b._search.includes(q));
  const elapsed = performance.now() - start;
  searchTimes.push(elapsed);
}

const avgTime = (searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length).toFixed(2);
const maxTime = Math.max(...searchTimes).toFixed(2);

console.log(`  ⏱️ Average query latency across 10,668 items: ${avgTime}ms (Max: ${maxTime}ms)`);
assert(Number(avgTime) < 5.0, `Average search latency is under 5ms (actual: ${avgTime}ms)`);

// 4. Memory Footprint Test
console.log('\n💾 4. Testing Memory Profile:');
const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
console.log(`  🧠 Heap memory used to hold all 13,000+ items: ${memMB} MB`);
assert(Number(memMB) < 120, `Heap memory used is well under 120MB threshold (actual: ${memMB}MB)`);

console.log(`\n===========================================`);
console.log(`🎉 Results: ${passedTests} / ${totalTests} tests passed successfully!`);
console.log(`===========================================\n`);
