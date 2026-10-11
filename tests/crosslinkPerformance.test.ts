import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { crossLinkAllDatasets } from '../src/utils/crosslink';

describe('Cross-Link Dataset Performance & Integrity', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const storesData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'stores.json'), 'utf-8'));
  const dealsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'deals.json'), 'utf-8'));
  const billingData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'billing_stores.json'), 'utf-8'));

  it('crosslinks datasets efficiently within performance budget', () => {
    const stateObj = {
      allStores: JSON.parse(JSON.stringify(storesData.stores || storesData)),
      allDeals: JSON.parse(JSON.stringify(dealsData.deals || dealsData)),
      allBillingStores: JSON.parse(JSON.stringify(billingData.stores || billingData)),
    };

    const start = performance.now();
    crossLinkAllDatasets(stateObj);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // Cross-link should complete in well under 1 second
    expect(stateObj.allStores.length).toBeGreaterThan(0);
    expect(stateObj.allDeals.length).toBeGreaterThan(0);
  });
});
