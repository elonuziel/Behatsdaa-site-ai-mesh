/**
 * Headless UI & DOM Integration Tests for stores-list & deals dashboard.
 * Runs in Node.js using JSDOM with ES module support.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const htmlSource = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const storesData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'stores.json'), 'utf-8'));
const dealsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'deals.json'), 'utf-8'));
const billingData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'billing_stores.json'), 'utf-8'));
const walletsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'wallets_info.json'), 'utf-8'));

async function runTests() {
  console.log('====================================================');
  console.log('   Running UI & DOM Integration Tests (JSDOM)       ');
  console.log('====================================================\n');

  // Create virtual browser window
  const dom = new JSDOM(htmlSource, {
    url: 'https://elonuziel.github.io/Behatsdaa-site-ai-mesh/',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.tailwind = { config: {} };
    }
  });

  const { window } = dom;
  const { document } = window;

  // Set up window/document globals for ES modules in Node context
  global.window = window;
  global.document = document;
  global.localStorage = window.localStorage;
  try {
    Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
  } catch (e) {
    // navigator might already be defined
  }

  // Polyfill scrollIntoView for JSDOM
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function() {};

  // Polyfill Lucide icons
  window.lucide = {
    createIcons: () => {}
  };
  global.lucide = window.lucide;

  // Mock matchMedia
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };
  global.matchMedia = window.matchMedia;

  // Mock fetch to serve data/stores.json, data/deals.json, data/billing_stores.json, and data/wallets_info.json
  const mockFetch = async (url) => {
    if (url.includes('wallets_info.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(walletsData))
      };
    }
    if (url.includes('billing_stores.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(billingData))
      };
    }
    if (url.includes('stores.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(storesData))
      };
    }
    if (url.includes('deals.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(dealsData))
      };
    }
    return { ok: false, status: 404 };
  };
  window.fetch = mockFetch;
  global.fetch = mockFetch;

  // Intercept uncaught console errors
  const consoleErrors = [];
  const originalError = window.console.error;
  window.console.error = (...args) => {
    consoleErrors.push(args.join(' '));
    originalError.apply(window.console, args);
  };

  // Dynamically import app.js entry module
  const appJsPath = 'file://' + path.join(ROOT_DIR, 'app.js');
  await import(appJsPath);

  // Wait for initial store render and background datasets
  await new Promise(r => setTimeout(r, 250));

  // --- Test 1: Page Title and Initial Tab State ---
  console.log('[Test 1] Verifying page title and initial tab state...');
  assert.ok(document.title.includes('רשתות'), 'Page title should mention stores');
  const storesSection = document.getElementById('stores-tab-section');
  const dealsSection = document.getElementById('deals-tab-section');
  assert.ok(!storesSection.classList.contains('hidden'), 'Stores section should be visible initially');
  assert.ok(dealsSection.classList.contains('hidden'), 'Deals section should be hidden initially');
  console.log('  -> PASS');

  // --- Test 2: Store Counts and Card Rendering ---
  console.log('[Test 2] Verifying store count and cards rendering...');
  const tabStoresCount = document.getElementById('tab-stores-count');
  assert.strictEqual(tabStoresCount.textContent, String(storesData.stores.length));
  const storeCards = document.querySelectorAll('#cards-view .store-card');
  assert.ok(storeCards.length > 0, 'Store cards should be rendered in grid');
  console.log(`  -> PASS (${storeCards.length} store cards rendered)`);

  // --- Test 3: Cross-Linking: Store with Active Deal has Badge ---
  console.log('[Test 3] Verifying cross-linking badge on stores with deals...');
  const matchedDeal = dealsData.deals.find(d => d.matched_store_name);
  const targetStoreName = matchedDeal ? matchedDeal.matched_store_name : 'אסקייפלנד';

  // Search for the store with a deal so it is rendered
  const searchInput = document.getElementById('search-input');
  searchInput.value = targetStoreName;
  searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const storeCardsAfterSearch = document.querySelectorAll('#cards-view .store-card');
  const storeWithDeal = Array.from(storeCardsAfterSearch).find(card => 
    card.textContent.includes(targetStoreName)
  );
  assert.ok(storeWithDeal, `Found store card for ${targetStoreName}`);
  const dealBadge = storeWithDeal.querySelector('[data-action="view-linked-deal"]');
  assert.ok(dealBadge, 'Store card should have a linked deal badge');
  console.log('  -> PASS (Linked deal badge successfully detected on store card)');

  // Clear search for subsequent tests
  const clearStoresSearchBtn = document.getElementById('clear-search-btn');
  if (clearStoresSearchBtn) {
    clearStoresSearchBtn.click();
  } else {
    searchInput.value = '';
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await new Promise(r => setTimeout(r, 180));

  // --- Test 4: Switching to Deals Tab & Progressive Rendering ---
  console.log('[Test 4] Switching to Deals & Vouchers tab...');
  const tabDealsBtn = document.getElementById('tab-deals-btn');
  tabDealsBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden in deals view');
  assert.ok(!dealsSection.classList.contains('hidden'), 'Deals section should be visible');
  const tabDealsCount = document.getElementById('tab-deals-count');
  assert.strictEqual(tabDealsCount.textContent, String(dealsData.deals.length));
  
  let dealCards = document.querySelectorAll('#deals-grid .deal-card');
  const initialExpected = Math.min(dealsData.deals.length, 30);
  assert.strictEqual(dealCards.length, initialExpected, `Expected initial batch of ${initialExpected} deals`);

  // Test Load More button
  const loadMoreBtn = document.getElementById('deals-load-more-btn');
  if (dealsData.deals.length > 30) {
    assert.ok(loadMoreBtn, 'Load more button should exist');
    loadMoreBtn.click();
    await new Promise(r => setTimeout(r, 50));
    dealCards = document.querySelectorAll('#deals-grid .deal-card');
    const secondExpected = Math.min(dealsData.deals.length, 60);
    assert.strictEqual(dealCards.length, secondExpected, `Deals count should expand to ${secondExpected} after Load More`);
  }
  console.log(`  -> PASS (Successfully switched to Deals tab with progressive rendering validated)`);

  // --- Test 5: Deals Live Search Filter ---
  console.log('[Test 5] Testing Deals live search filter...');
  const dealsSearchInput = document.getElementById('deals-search-input');
  const sampleSearchTerm = dealsData.deals[0].title.split(' ')[0] || 'סושי';
  dealsSearchInput.value = sampleSearchTerm;
  dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  let filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(filteredDeals.length > 0 && filteredDeals.length <= dealsData.deals.length, 'Should filter deals by search term');
  assert.ok(filteredDeals[0].textContent.includes(sampleSearchTerm), 'Card content should include search term');

  // Clear search
  const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
  clearDealsSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
  filteredDeals = document.querySelectorAll('#deals-grid .deal-card');
  const resetExpected = Math.min(dealsData.deals.length, 30);
  assert.strictEqual(filteredDeals.length, resetExpected, `Expected ${resetExpected} deals restored after clear`);
  console.log('  -> PASS (Live search filter works correctly)');

  // --- Test 6: Deals Price Filter ---
  console.log('[Test 6] Testing Deals max price filter (<= 100 ₪)...');
  const dealsPriceFilterSelect = document.getElementById('deals-price-filter-select');
  dealsPriceFilterSelect.value = '100';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  const budgetDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(budgetDeals.length > 0 && budgetDeals.length <= dealsData.deals.length, 'Should filter deals within budget');

  // Reset price filter
  dealsPriceFilterSelect.value = 'all';
  dealsPriceFilterSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Price filter works correctly)');

  // --- Test 7: Deal Details Modal & Pricing ---
  console.log('[Test 7] Testing Deal details modal & pricing display...');
  const firstDealCard = document.querySelector('#deals-grid .deal-card');

  firstDealCard.click();
  await new Promise(r => setTimeout(r, 50));

  const dealModal = document.getElementById('deal-modal');
  assert.ok(!dealModal.classList.contains('hidden'), 'Deal modal should be open');
  const modalTitle = document.getElementById('deal-modal-title').textContent;
  assert.ok(modalTitle.length > 0, 'Modal title should be populated');

  const buyLink = document.getElementById('deal-modal-buy-link').href;
  assert.ok(buyLink.includes('behatsdaa.org.il/category/productPage'), 'Buy link should point to Behatsdaa product page');

  // Close modal
  const dealModalCloseBtn = document.getElementById('deal-modal-close-btn');
  dealModalCloseBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(dealModal.classList.contains('hidden'), 'Deal modal should be closed');
  console.log('  -> PASS (Deal modal renders and closes correctly)');

  // --- Test 8: Reverse Link: Voucher to Store on Card ---
  console.log('[Test 8] Testing reverse link from voucher to store on cards...');
  const dealWithStoreData = dealsData.deals.find(d => d.matched_store_name);
  if (dealWithStoreData) {
    dealsSearchInput.value = dealWithStoreData.title;
    dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));
  }
  const dealWithStore = Array.from(document.querySelectorAll('#deals-grid .deal-card')).find(c => 
    c.querySelector('[data-action="view-linked-store"]')
  );
  assert.ok(dealWithStore, 'Found deal with linked store on cards');
  const storeLinkBtn = dealWithStore.querySelector('[data-action="view-linked-store"]');
  assert.ok(storeLinkBtn, 'Deal card should have link to store on cards');

  // Open deal modal for this deal and verify banner
  dealWithStore.click();
  await new Promise(r => setTimeout(r, 50));
  const modalStoreBanner = document.getElementById('deal-modal-linked-store-banner');
  assert.ok(!modalStoreBanner.classList.contains('hidden'), 'Deal modal should show linked store banner');

  // Click banner button to jump to store
  const viewStoreBtn = document.getElementById('deal-modal-view-store-btn');
  viewStoreBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(!storesSection.classList.contains('hidden'), 'Should transition to Stores tab');
  assert.ok(document.getElementById('search-input').value.length > 0, 'Store search should be pre-filled');
  console.log('  -> PASS (Reverse link from voucher to store works on both card and modal)');

  // --- Test 9: Store Card to Deals Jump Navigation ---
  console.log('[Test 9] Testing cross-link jump from store card to deals...');
  // Switch back to stores and search for store with deal
  const tabStoresBtn = document.getElementById('tab-stores-btn');
  tabStoresBtn.click();
  const searchInputStores = document.getElementById('search-input');
  if (searchInputStores) {
    searchInputStores.value = targetStoreName;
    searchInputStores.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await new Promise(r => setTimeout(r, 180));

  const storeWithBadge = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c => 
    c.querySelector('[data-action="view-linked-deal"]')
  );
  assert.ok(storeWithBadge, 'Found store card with linked deal badge');
  const jumpBtn = storeWithBadge.querySelector('[data-action="view-linked-deal"]');
  assert.ok(jumpBtn, 'Found jump button on store card');
  const storeName = storeWithBadge.querySelector('h3').textContent.trim();
  jumpBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(!dealsSection.classList.contains('hidden'), 'Should jump to Deals tab');
  assert.strictEqual(dealsSearchInput.value, storeName, 'Deals search should be pre-filled with store name');
  console.log('  -> PASS (Store badge jump successfully navigates to pre-filtered Deals tab)');

  // --- Test 10: Dark / Light Mode Toggle ---
  console.log('[Test 10] Testing Theme Toggle...');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const wasDark = document.documentElement.classList.contains('dark');
  themeToggleBtn.click();
  assert.notStrictEqual(document.documentElement.classList.contains('dark'), wasDark);
  themeToggleBtn.click();
  assert.strictEqual(document.documentElement.classList.contains('dark'), wasDark);
  console.log('  -> PASS (Theme toggle switches light/dark classes properly)');

  // --- Test 11: Switch to Statement Discounts (Billing) Tab & Carryover ---
  console.log('[Test 11] Switching to Statement Discounts (Billing) tab...');
  const tabBillingBtn = document.getElementById('tab-billing-btn');
  assert.ok(tabBillingBtn, 'Tab billing button should exist');
  tabBillingBtn.click();
  await new Promise(r => setTimeout(r, 50));

  const billingSection = document.getElementById('billing-tab-section');
  assert.ok(!billingSection.classList.contains('hidden'), 'Billing section should be visible');
  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden');
  assert.ok(dealsSection.classList.contains('hidden'), 'Deals section should be hidden');

  // Verify search term carried over from Deals tab (from Test 9)
  assert.strictEqual(document.getElementById('billing-search-input').value, storeName, 'Billing search should carry over search term from Deals tab');

  // Clear billing search to verify progressive rendering on full dataset
  const clearBtn = document.getElementById('clear-billing-search-btn');
  if (clearBtn) clearBtn.click();
  await new Promise(r => setTimeout(r, 50));

  let billingCards = document.querySelectorAll('#billing-grid .billing-card');
  const initialBillingExpected = Math.min(billingData.stores.length, 30);
  assert.strictEqual(billingCards.length, initialBillingExpected, `Expected initial batch of ${initialBillingExpected} billing stores`);

  // Test Load More button
  const billingLoadMoreBtn = document.getElementById('billing-load-more-btn');
  if (billingData.stores.length > 30) {
    assert.ok(billingLoadMoreBtn, 'Load more button for billing should exist');
    billingLoadMoreBtn.click();
    await new Promise(r => setTimeout(r, 50));
    billingCards = document.querySelectorAll('#billing-grid .billing-card');
    const secondBillingExpected = Math.min(billingData.stores.length, 60);
    assert.strictEqual(billingCards.length, secondBillingExpected, `Billing count should expand to ${secondBillingExpected} after Load More`);
  }
  console.log('  -> PASS (Switched to Billing tab with progressive rendering validated)');

  // --- Test 12: Billing Live Search Filter ---
  console.log('[Test 12] Testing Billing live search filter...');
  const billingSearchInput = document.getElementById('billing-search-input');
  const sampleBillingSearch = 'פיצה';
  billingSearchInput.value = sampleBillingSearch;
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  let filteredBilling = document.querySelectorAll('#billing-grid .billing-card');
  assert.ok(filteredBilling.length > 0 && filteredBilling.length <= billingData.stores.length, 'Should filter billing stores by search');
  assert.ok(filteredBilling[0].textContent.includes(sampleBillingSearch), 'Card content should include search term');

  // Clear search
  const clearBillingSearchBtn = document.getElementById('clear-billing-search-btn');
  clearBillingSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
  filteredBilling = document.querySelectorAll('#billing-grid .billing-card');
  const resetBillingExpected = Math.min(billingData.stores.length, 30);
  assert.strictEqual(filteredBilling.length, resetBillingExpected, `Expected ${resetBillingExpected} billing stores restored after clear`);
  console.log('  -> PASS (Billing live search filter works correctly)');

  // --- Test 13: Billing City Dropdown Filter ---
  console.log('[Test 13] Testing Billing city dropdown filter...');
  const billingCitySelect = document.getElementById('billing-city-select');
  assert.ok(billingCitySelect, 'Billing city select should exist');
  assert.ok(billingCitySelect.options.length > 1, 'City options should be populated');

  // Select the second option (e.g. online or top city)
  const targetCityValue = billingCitySelect.options[1].value;
  billingCitySelect.value = targetCityValue;
  billingCitySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));

  const cityFilteredCards = document.querySelectorAll('#billing-grid .billing-card');
  assert.ok(cityFilteredCards.length > 0, 'City filtered cards should be present');

  // Reset city filter
  billingCitySelect.value = 'all';
  billingCitySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Billing city filter works correctly)');

  // --- Test 14: Billing Details Modal ---
  console.log('[Test 14] Testing Billing details modal...');
  const firstBillingCard = document.querySelector('#billing-grid .billing-card');
  firstBillingCard.click();
  await new Promise(r => setTimeout(r, 50));

  const billingModal = document.getElementById('billing-modal');
  assert.ok(!billingModal.classList.contains('hidden'), 'Billing modal should be open');
  const billingModalTitle = document.getElementById('billing-modal-title').textContent;
  assert.ok(billingModalTitle.length > 0, 'Billing modal title should be populated');

  const billingModalDiscount = document.getElementById('billing-modal-discount').textContent;
  assert.ok(billingModalDiscount.includes('%'), 'Billing modal discount should include %');

  const officialLink = document.getElementById('billing-modal-official-link').href;
  assert.ok(officialLink.includes('be-plus.co.il/product/'), 'Official link should use valid /product/{id} routing');
  assert.ok(!officialLink.includes('/component/crm/'), 'Official link must not contain broken /component/crm/ route');

  // Verify card logo attributes
  const cardImg = firstBillingCard.querySelector('img');
  if (cardImg) {
    assert.strictEqual(cardImg.getAttribute('loading'), 'lazy', 'Card image should have loading="lazy"');
    assert.strictEqual(cardImg.getAttribute('referrerpolicy'), 'no-referrer', 'Card image should have referrerpolicy="no-referrer"');
  }

  // Verify modal logo attributes
  const modalLogo = document.getElementById('billing-modal-logo');
  assert.strictEqual(modalLogo.getAttribute('referrerpolicy'), 'no-referrer', 'Modal logo should have referrerpolicy="no-referrer"');

  // Close modal
  const billingModalCloseBtn = document.getElementById('billing-modal-close-btn');
  billingModalCloseBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(billingModal.classList.contains('hidden'), 'Billing modal should be closed');
  console.log('  -> PASS (Billing modal renders and closes correctly)');

  // --- Test 15: Cross-Link Jump to Billing Tab from Store Card ---
  console.log('[Test 15] Testing cross-link jump from Store card to Billing tab...');
  tabStoresBtn.click();
  const searchInputStoresEl = document.getElementById('search-input');
  if (searchInputStoresEl) {
    searchInputStoresEl.value = 'ריקושט';
    searchInputStoresEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
  }

  // Find a store with linked billing badge
  const storeWithBilling = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c =>
    c.querySelector('[data-action="view-linked-billing"]')
  );
  assert.ok(storeWithBilling, 'Found store card with linked billing badge');
  const billingJumpBtn = storeWithBilling.querySelector('[data-action="view-linked-billing"]');
  assert.ok(billingJumpBtn, 'Found billing jump button on store card');
  billingJumpBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(!billingSection.classList.contains('hidden'), 'Should transition to Billing tab');
  assert.ok(billingSearchInput.value.length > 0, 'Billing search should be pre-filled with store name');

  // --- Test 16: Tab 3 Store Search vs Description & Cross-Linking Integrity ---
  console.log('[Test 16] Verifying Tab 3 store-only matching and cross-link integrity...');
  // Ensure we are on billing tab
  tabBillingBtn.click();

  // Dynamically select a search term from billing store names that also appears in descriptions
  const billingSearchTerm = (() => {
    for (const b of billingData.stores) {
      const words = (b.name || '').split(/[\s\-–,.]+/).filter(w => w.length >= 3 && /[\u0590-\u05FF]/.test(w));
      for (const w of words) {
        if (billingData.stores.some(other => other.description && other.description.includes(w) && !other.name.includes(w))) {
          return w;
        }
      }
    }
    return billingData.stores[0]?.name.split(' ')[0] || 'קפה';
  })();

  billingSearchInput.value = billingSearchTerm;
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));

  const matchingCountText = document.getElementById('matching-billing-count').textContent.trim();
  const countWithoutDescNum = parseInt(matchingCountText, 10);
  assert.ok(countWithoutDescNum > 0, `Expected at least 1 billing store matching "${billingSearchTerm}", got ${matchingCountText}`);

  const renderedBillingCards = document.querySelectorAll('#billing-grid .billing-card');
  assert.strictEqual(renderedBillingCards.length, Math.min(countWithoutDescNum, 30), `Should render up to initial batch of matching stores`);

  // Verify that all returned stores actually contain the search term in their card text (name/city/category)
  renderedBillingCards.forEach(card => {
    assert.ok(card.textContent.includes(billingSearchTerm), `Card text must contain "${billingSearchTerm}"`);
  });

  // Verify cross-link integrity: single-word chain stores must never falsely link to compound merchant names
  const singleWordStores = storesData.stores.filter(s => {
    const sName = s.name.trim();
    return sName.length >= 3 && !sName.includes(' ') && /[\u0590-\u05FF]/.test(sName);
  });
  let checkedCompoundPairs = 0;
  singleWordStores.forEach(s => {
    const sName = s.name.trim();
    const compounds = billingData.stores.filter(b => b.name.trim() !== sName && b.name.trim().split(/\s+/).includes(sName));
    compounds.forEach(c => {
      checkedCompoundPairs++;
      if (c.linked_store) {
        assert.notStrictEqual(c.linked_store.id, s.id, `Compound business "${c.name}" must not falsely link to single-word store "${sName}"`);
      }
    });
  });
  assert.ok(checkedCompoundPairs > 0, `Verified ${checkedCompoundPairs} compound store-name pairs across single-word stores against false cross-linking`);

  // Now enable the "Search in Description" toggle in Tab 3
  const billingSearchDescToggle = document.getElementById('billing-search-desc-toggle');
  assert.ok(billingSearchDescToggle, 'billingSearchDescToggle should exist');
  billingSearchDescToggle.checked = true;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  const countWithDesc = document.getElementById('matching-billing-count').textContent.trim();
  const countWithDescNum = parseInt(countWithDesc, 10);
  assert.ok(countWithDescNum >= countWithoutDescNum, `Expected more or equal stores with description search enabled (${countWithDescNum}) than without (${countWithoutDescNum})`);
  assert.ok(document.getElementById('active-billing-filter-text').textContent.includes('כולל תיאור'), 'Filter badge should mention כולל תיאור');

  // Disable toggle again
  billingSearchDescToggle.checked = false;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(document.getElementById('matching-billing-count').textContent.trim(), String(countWithoutDescNum), `Should return to ${countWithoutDescNum} stores when description toggle is off`);

  // Verify that street address terms (e.g. "דוגי" matching address "הדוגית 16" on "מספרת פריזורה") only match when description/address toggle is enabled
  billingSearchInput.value = 'דוגי';
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  const countDugiWithoutDesc = parseInt(document.getElementById('matching-billing-count').textContent.trim(), 10);
  assert.strictEqual(countDugiWithoutDesc, 0, 'Address-only match ("דוגי" for "הדוגית") must NOT appear without description toggle enabled');

  billingSearchDescToggle.checked = true;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const countDugiWithDesc = parseInt(document.getElementById('matching-billing-count').textContent.trim(), 10);
  assert.ok(countDugiWithDesc > 0, 'Address match ("דוגי" for "הדוגית 16") should appear when description toggle is enabled');

  billingSearchDescToggle.checked = false;
  billingSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));

  // Clear billing search
  clearBillingSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // Test description toggle in Tab 2 (Deals)
  tabDealsBtn.click();
  await new Promise(r => setTimeout(r, 50));
  const dealsSearchDescToggle = document.getElementById('deals-search-desc-toggle');
  assert.ok(dealsSearchDescToggle, 'dealsSearchDescToggle should exist');

  // Dynamically select a search term from deals
  const dealsSearchTerm = (() => {
    for (const d of dealsData.deals) {
      const words = (d.title || '').split(/[\s\-–,.]+/).filter(w => w.length >= 3 && /[\u0590-\u05FF]/.test(w));
      if (words.length > 0) return words[0];
    }
    return 'שובר';
  })();

  dealsSearchInput.value = dealsSearchTerm;
  dealsSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const dealsCountWithoutDesc = parseInt(document.getElementById('matching-deals-count').textContent.trim(), 10);
  assert.ok(dealsCountWithoutDesc > 0, `Expected at least 1 deal matching "${dealsSearchTerm}" without desc, got ${dealsCountWithoutDesc}`);

  dealsSearchDescToggle.checked = true;
  dealsSearchDescToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const dealsCountWithDesc = parseInt(document.getElementById('matching-deals-count').textContent.trim(), 10);
  assert.ok(dealsCountWithDesc >= dealsCountWithoutDesc, `Expected deals with desc (${dealsCountWithDesc}) to be >= without desc (${dealsCountWithoutDesc})`);

  // Clear deals search
  clearDealsSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // Test description toggle in Tab 1 (Stores)
  tabStoresBtn.click();
  await new Promise(r => setTimeout(r, 50));
  const storesSearchDescToggle = document.getElementById('stores-search-desc-toggle');
  assert.ok(storesSearchDescToggle, 'storesSearchDescToggle should exist');

  console.log('  -> PASS (Special option to search in description validated across all 3 tabs)');

  // --- Test 17: Tab 3 Compatible Store Cards Preview and Deals List in Modal ---
  console.log('[Test 17] Testing Tab 3 compatible store cards preview and deals list in modal...');
  tabBillingBtn.click();

  // Find a billing business that matches a rechargeable chain store
  const compatibleMerchant = billingData.stores.find(b =>
    storesData.stores.some(s => s.name.trim().toLowerCase() === b.name.trim().toLowerCase())
  );
  const targetBillingStoreName = compatibleMerchant ? compatibleMerchant.name : 'בורגרים';

  billingSearchInput.value = targetBillingStoreName;
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));

  const compatibleCard = document.querySelector('#billing-grid .billing-card');
  assert.ok(compatibleCard, `Found billing card for ${targetBillingStoreName}`);
  const storeLinkBadge = compatibleCard.querySelector('[data-action="view-linked-store"]');
  assert.ok(storeLinkBadge, 'Billing card should have linked store badge for compatible store');
  assert.ok(storeLinkBadge.textContent.includes('מכבד כרטיסים'), 'Should display rechargeable cards info');

  // Open billing modal for this card
  compatibleCard.click();
  await new Promise(r => setTimeout(r, 50));

  const billingModalLinkedStoreBanner = document.getElementById('billing-modal-linked-store-banner');
  assert.ok(!billingModalLinkedStoreBanner.classList.contains('hidden'), 'Billing modal should show linked store banner');
  const billingModalCardsList = document.getElementById('billing-modal-cards-list');
  assert.ok(billingModalCardsList, 'Billing modal cards list should exist');
  assert.ok(billingModalCardsList.children.length > 0, 'Billing modal cards list should be populated with cards');
  
  // Close billing modal
  document.getElementById('billing-modal-close-btn').click();
  await new Promise(r => setTimeout(r, 50));
  console.log('  -> PASS (Tab 3 displays compatible cards & deals on cards and in modal)');

  // --- Test 18: Search Term Carryover, Overwriting, Clearing & Cross-Link Preservation ---
  console.log('[Test 18] Testing Search-Term Carryover, Overwriting, Clearing, and Cross-Link Preservation...');
  {
    const tabStoresBtnEl = document.getElementById('tab-stores-btn');
    const tabDealsBtnEl = document.getElementById('tab-deals-btn');
    const tabBillingBtnEl = document.getElementById('tab-billing-btn');
    const searchInputEl = document.getElementById('search-input');
    const dealsSearchInputEl = document.getElementById('deals-search-input');
    const billingSearchInputEl = document.getElementById('billing-search-input');
    const clearSearchBtnEl = document.getElementById('clear-search-btn');
    const clearDealsBtnEl = document.getElementById('clear-deals-search-btn');
    const clearBillingBtnEl = document.getElementById('clear-billing-search-btn');

    // 1. Carrying search term: Stores -> Deals
    tabStoresBtnEl.click();
    searchInputEl.value = 'פיצה';
    searchInputEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));

    tabDealsBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(dealsSearchInputEl.value, 'פיצה', 'Deals search input should carry over "פיצה" from Stores tab');
    assert.ok(!clearDealsBtnEl.classList.contains('hidden'), 'Clear deals search button should be visible');
    const dealsCards = document.querySelectorAll('#deals-grid .deal-card');
    assert.ok(dealsCards.length > 0, 'Deals should render results for carried search term');

    // 2. Overwriting destination search term: Deals -> Billing
    dealsSearchInputEl.value = 'ספורט';
    dealsSearchInputEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));

    tabBillingBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(billingSearchInputEl.value, 'ספורט', 'Billing search input should overwrite with "ספורט" from Deals tab');
    assert.ok(!clearBillingBtnEl.classList.contains('hidden'), 'Clear billing search button should be visible');

    // 3. Clearing destination search when source search is empty: Billing -> Stores
    clearBillingBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(billingSearchInputEl.value, '', 'Billing search should be empty after clear');

    tabStoresBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(searchInputEl.value, '', 'Stores search input should be cleared when switching from empty Billing tab');
    assert.ok(clearSearchBtnEl.classList.contains('hidden'), 'Clear stores search button should be hidden when search is empty');

    // 4. Preserving intended search for cross-link navigation
    searchInputEl.value = 'פיצה';
    searchInputEl.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 180));

    const storeWithBadge = Array.from(document.querySelectorAll('#cards-view .store-card')).find(c =>
      c.querySelector('[data-action="view-linked-deal"]')
    );
    assert.ok(storeWithBadge, 'Found store card with linked deal badge');
    const badgeBtn = storeWithBadge.querySelector('[data-action="view-linked-deal"]');
    const badgeStoreName = storeWithBadge.querySelector('h3').textContent.trim();
    badgeBtn.click();
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(dealsSearchInputEl.value, badgeStoreName, 'Cross-link jump should preserve intended store search term, not source search term ("פיצה")');
    assert.notStrictEqual(dealsSearchInputEl.value, 'פיצה', 'Cross-link search should not be overwritten by source tab search query');

    // Clean up search
    if (clearDealsBtnEl) clearDealsBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
  }
  console.log('  -> PASS (Search term carryover, overwriting, clearing, and cross-link preservation validated)');

  // --- Test 19: Wallets Terms & Caps Guide Modal and Filtering Integration ---
  console.log('[Test 19] Testing Wallets Terms & Caps Guide Modal and Filtering Integration...');
  {
    const walletsGuideBtnEl = document.getElementById('wallets-guide-btn');
    const walletsModalEl = document.getElementById('wallets-modal');
    const walletsModalCardsGridEl = document.getElementById('wallets-modal-cards-grid');
    const cardFilterSelectEl = document.getElementById('card-filter-select');

    assert.ok(walletsGuideBtnEl, 'walletsGuideBtn should exist in Tab 1 header');
    assert.ok(walletsModalEl, 'walletsModal should exist in DOM');
    assert.ok(walletsModalEl.classList.contains('hidden'), 'walletsModal should initially be hidden');

    // 1. Open wallets guide modal via Tab 1 button
    walletsGuideBtnEl.click();
    await new Promise(r => setTimeout(r, 60));
    assert.ok(!walletsModalEl.classList.contains('hidden'), 'walletsModal should be open after clicking walletsGuideBtn');

    // Verify modal content & key cap figures
    assert.ok(walletsModalEl.textContent.includes('3,000 ₪'), 'Modal should display 3,000 ₪ monthly cap');
    assert.ok(walletsModalEl.textContent.includes('1,000 ₪'), 'Modal should display 1,000 ₪ instant balance cap');
    assert.ok(walletsModalEl.textContent.includes('100 ₪'), 'Modal should display 100 ₪ min reload');
    assert.ok(walletsModalEl.textContent.includes('כפל מבצעים'), 'Modal should highlight promotions stacking');

    // Verify wallet cards rendered in grid
    const renderedWalletCards = walletsModalCardsGridEl.querySelectorAll('[data-action="filter-wallet"]');
    assert.strictEqual(renderedWalletCards.length, 6, `Expected 6 wallet cards in modal, found ${renderedWalletCards.length}`);

    // 2. Click "סנן רשתות בארנק זה" on the first wallet card
    const firstWalletBtn = renderedWalletCards[0];
    const firstWalletName = decodeURIComponent(firstWalletBtn.dataset.cardName);
    firstWalletBtn.click();
    await new Promise(r => setTimeout(r, 60));

    assert.ok(walletsModalEl.classList.contains('hidden'), 'walletsModal should close after selecting a wallet filter');
    assert.strictEqual(cardFilterSelectEl.value, firstWalletName, 'cardFilterSelect value should be set to chosen wallet');
    const matchingStoresCountEl = document.getElementById('matching-count');
    const filteredCount = parseInt(matchingStoresCountEl.textContent, 10);
    assert.ok(filteredCount > 0, `Stores should be filtered for wallet ${firstWalletName} (found ${filteredCount})`);

    // 3. Open store modal and verify opening wallets guide modal from store modal
    const firstStoreCard = document.querySelector('#cards-view .store-card');
    assert.ok(firstStoreCard, 'At least one store card should be visible');
    firstStoreCard.click();
    await new Promise(r => setTimeout(r, 60));

    const storeModalEl = document.getElementById('store-modal');
    assert.ok(!storeModalEl.classList.contains('hidden'), 'storeModal should be open');
    const storeModalWalletsInfoBtnEl = document.getElementById('store-modal-wallets-info-btn');
    assert.ok(storeModalWalletsInfoBtnEl, 'storeModalWalletsInfoBtn should exist in store modal');

    storeModalWalletsInfoBtnEl.click();
    await new Promise(r => setTimeout(r, 60));
    assert.ok(!walletsModalEl.classList.contains('hidden'), 'walletsModal should open from store modal button');

    // 4. Test closing via Escape key
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    assert.ok(walletsModalEl.classList.contains('hidden'), 'walletsModal should close on Escape key');

    // Reset card filter back to 'all'
    cardFilterSelectEl.value = 'all';
    cardFilterSelectEl.dispatchEvent(new window.Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
  }
  console.log('  -> PASS (Wallets guide modal, caps highlights, 6 wallet cards, and quick filtering validated)');

  // --- Test 20: Zero Console Errors ---
  console.log('[Test 20] Checking for console errors...');
  assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, but found: ${consoleErrors.join(', ')}`);
  console.log('  -> PASS (Zero errors during entire session)');

  console.log('\n====================================================');
  console.log('   ALL 20 UI & DOM INTEGRATION TESTS PASSED!       ');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]', err);
  process.exit(1);
});
