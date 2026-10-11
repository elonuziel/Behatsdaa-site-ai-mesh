import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://localhost/'
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

const storesData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'deals.json'), 'utf-8'));
const billingData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'billing_stores.json'), 'utf-8'));

import { crossLinkAllDatasets } from '../src/utils/crosslink.ts';

async function benchmarkCrossLink(iterations = 50) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const stateObj = {
      allStores: JSON.parse(JSON.stringify(storesData.stores)),
      allDeals: JSON.parse(JSON.stringify(dealsData.deals)),
      allBillingStores: JSON.parse(JSON.stringify(billingData.stores))
    };

    const start = performance.now();
    crossLinkAllDatasets(stateObj);
    const end = performance.now();
    times.push(end - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return avg;
}

async function benchmarkOptimizedDealLookup(iterations = 500) {
  const stateObj = {
    allStores: JSON.parse(JSON.stringify(storesData.stores)),
    allDeals: JSON.parse(JSON.stringify(dealsData.deals)),
    allBillingStores: JSON.parse(JSON.stringify(billingData.stores))
  };

  crossLinkAllDatasets(stateObj);

  const startCardMatch = performance.now();
  for (let i = 0; i < iterations; i++) {
    stateObj.allDeals.forEach(deal => {
      const matchedStore = deal.linkedStore || null;
    });
  }
  const endCardMatch = performance.now();

  return {
    cardMatchAvg: (endCardMatch - startCardMatch) / iterations
  };
}

console.log('--- OPTIMIZED BENCHMARK MEASUREMENT ---');
const crossLinkAvg = await benchmarkCrossLink(50);
console.log(`Cross-link dataset avg time: ${crossLinkAvg.toFixed(3)} ms`);

const lookups = await benchmarkOptimizedDealLookup(500);
console.log(`Optimized deal lookup avg time per pass (1921 deals): ${lookups.cardMatchAvg.toFixed(4)} ms`);
