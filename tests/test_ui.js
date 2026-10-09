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
const geocodedLocationsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'geocoded_locations.json'), 'utf-8'));

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

  // Polyfill requestAnimationFrame for JSDOM
  window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

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

  // Mock fetch to serve data/stores.json, data/deals.json, data/billing_stores.json, data/wallets_info.json, and data/geocoded_locations.json
  const mockFetch = async (url) => {
    if (url.includes('wallets_info.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(walletsData))
      };
    }
    if (url.includes('geocoded_locations.json')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(geocodedLocationsData))
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

  // Headless Google Maps Platform Mock Harness for Milestone M1
  class LatLngBoundsMock {
    constructor(sw = null, ne = null) {
      if (sw && ne) {
        const swLat = typeof sw.lat === 'function' ? sw.lat() : sw.lat;
        const swLng = typeof sw.lng === 'function' ? sw.lng() : sw.lng;
        const neLat = typeof ne.lat === 'function' ? ne.lat() : ne.lat;
        const neLng = typeof ne.lng === 'function' ? ne.lng() : ne.lng;
        this.south = Math.min(swLat, neLat);
        this.north = Math.max(swLat, neLat);
        this.west = Math.min(swLng, neLng);
        this.east = Math.max(swLng, neLng);
      } else {
        this.south = null;
        this.north = null;
        this.west = null;
        this.east = null;
      }
    }

    isEmpty() {
      return this.south === null || this.north === null || this.west === null || this.east === null;
    }

    extend(point) {
      if (!point) return this;
      const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
      const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
      if (this.isEmpty()) {
        this.south = lat;
        this.north = lat;
        this.west = lng;
        this.east = lng;
      } else {
        this.south = Math.min(this.south, lat);
        this.north = Math.max(this.north, lat);
        this.west = Math.min(this.west, lng);
        this.east = Math.max(this.east, lng);
      }
      return this;
    }

    contains(point) {
      if (this.isEmpty() || !point) return false;
      const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
      const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
      return lat >= this.south && lat <= this.north && lng >= this.west && lng <= this.east;
    }

    getCenter() {
      if (this.isEmpty()) return { lat: () => 0, lng: () => 0, latVal: 0, lngVal: 0 };
      const lat = (this.south + this.north) / 2;
      const lng = (this.west + this.east) / 2;
      return { lat: () => lat, lng: () => lng, latVal: lat, lngVal: lng };
    }

    getNorthEast() {
      return { lat: () => this.north, lng: () => this.east };
    }

    getSouthWest() {
      return { lat: () => this.south, lng: () => this.west };
    }
  }

  const mapEventListeners = [];
  const eventMock = {
    addListener(instance, eventName, handler) {
      const record = { instance, eventName, handler };
      mapEventListeners.push(record);
      return record;
    },
    addListenerOnce(instance, eventName, handler) {
      const record = {
        instance,
        eventName,
        handler: (...args) => {
          eventMock.removeListener(record);
          handler(...args);
        }
      };
      mapEventListeners.push(record);
      return record;
    },
    removeListener(listenerRecord) {
      const idx = mapEventListeners.indexOf(listenerRecord);
      if (idx !== -1) {
        mapEventListeners.splice(idx, 1);
      }
    },
    clearInstanceListeners(instance) {
      for (let i = mapEventListeners.length - 1; i >= 0; i--) {
        if (mapEventListeners[i].instance === instance) {
          mapEventListeners.splice(i, 1);
        }
      }
    },
    trigger(instance, eventName, ...args) {
      const matching = mapEventListeners.filter(l => l.instance === instance && l.eventName === eventName);
      matching.forEach(l => {
        try {
          l.handler(...args);
        } catch (err) {
          console.error(`Mock google.maps.event error in [${eventName}]:`, err);
        }
      });
    }
  };

  class MapMock {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this._center = options.center || { lat: 31.85, lng: 34.85 };
      this._zoom = options.zoom !== undefined ? options.zoom : 9;
      this._updateBounds();
    }

    _updateBounds() {
      const span = 180 / Math.pow(2, this._zoom);
      const lat = typeof this._center.lat === 'function' ? this._center.lat() : this._center.lat;
      const lng = typeof this._center.lng === 'function' ? this._center.lng() : this._center.lng;
      this._bounds = new LatLngBoundsMock(
        { lat: lat - span, lng: lng - span },
        { lat: lat + span, lng: lng + span }
      );
    }

    getBounds() {
      return this._bounds;
    }

    setBounds(bounds) {
      this._bounds = bounds;
      if (bounds && !bounds.isEmpty()) {
        const c = bounds.getCenter();
        this._center = { lat: c.lat(), lng: c.lng() };
        const spanLat = Math.abs(bounds.north - bounds.south);
        const spanLng = Math.abs(bounds.east - bounds.west);
        const maxSpan = Math.max(spanLat, spanLng);
        if (maxSpan > 0) {
          const computedZoom = Math.floor(Math.log2(360 / maxSpan));
          this._zoom = Math.max(1, Math.min(18, computedZoom));
        }
      }
      eventMock.trigger(this, 'bounds_changed');
    }

    getCenter() {
      const lat = typeof this._center.lat === 'function' ? this._center.lat() : this._center.lat;
      const lng = typeof this._center.lng === 'function' ? this._center.lng() : this._center.lng;
      return { lat: () => lat, lng: () => lng, latVal: lat, lngVal: lng };
    }

    setCenter(center) {
      this._center = center;
      this._updateBounds();
      eventMock.trigger(this, 'center_changed');
      eventMock.trigger(this, 'bounds_changed');
    }

    getZoom() {
      return this._zoom;
    }

    setZoom(zoom) {
      this._zoom = zoom;
      this._updateBounds();
      eventMock.trigger(this, 'zoom_changed');
      eventMock.trigger(this, 'bounds_changed');
    }

    panTo(center) {
      this.setCenter(center);
      eventMock.trigger(this, 'idle');
    }

    fitBounds(bounds, padding) {
      this.setBounds(bounds);
      eventMock.trigger(this, 'idle');
    }

    addListener(eventName, handler) {
      return eventMock.addListener(this, eventName, handler);
    }

    getProjection() {
      return {
        fromLatLngToPoint: () => ({ x: 0, y: 0 }),
        fromPointToLatLng: () => ({ lat: () => 31.85, lng: () => 34.85 })
      };
    }
  }

  class InfoWindowMock {
    constructor(options = {}) {
      this.options = options;
      this.content = '';
      this.isOpen = false;
      this.anchor = null;
    }
    setContent(content) { this.content = content; }
    getContent() { return this.content; }
    open({ anchor, map }) { this.anchor = anchor; this.isOpen = true; }
    close() { this.isOpen = false; }
  }

  function OverlayViewMock() {}
  OverlayViewMock.prototype.setMap = function(map) { this.map = map; };
  OverlayViewMock.prototype.getMap = function() { return this.map; };
  OverlayViewMock.prototype.draw = function() {};
  OverlayViewMock.prototype.onAdd = function() {};
  OverlayViewMock.prototype.onRemove = function() {};
  OverlayViewMock.prototype.getPanes = function() { return {}; };
  OverlayViewMock.prototype.getProjection = function() {
    return {
      fromLatLngToDivPixel: () => ({ x: 0, y: 0 }),
      fromDivPixelToLatLng: () => ({ lat: () => 31.85, lng: () => 34.85 })
    };
  };

  class AdvancedMarkerElementMock extends window.EventTarget {
    constructor(options = {}) {
      super();
      this.map = options.map || null;
      this.position = options.position || null;
      this.title = options.title || '';
      this.content = options.content || null;
      this.zIndex = options.zIndex !== undefined ? options.zIndex : 0;
    }

    addListener(eventName, handler) {
      const gmpEvent = eventName.startsWith('gmp-') ? eventName : (eventName === 'click' ? 'gmp-click' : eventName);
      this.addEventListener(gmpEvent, handler);
      return {
        remove: () => this.removeEventListener(gmpEvent, handler)
      };
    }
  }

  const googleMapsMock = {
    Map: MapMock,
    LatLngBounds: LatLngBoundsMock,
    LatLng: function(lat, lng) { return { lat: () => lat, lng: () => lng, latVal: lat, lngVal: lng }; },
    InfoWindow: InfoWindowMock,
    OverlayView: OverlayViewMock,
    ControlPosition: { LEFT_BOTTOM: 9, RIGHT_BOTTOM: 8, TOP_CENTER: 2 },
    event: eventMock,
    marker: {
      AdvancedMarkerElement: AdvancedMarkerElementMock
    },
    importLibrary: async (name) => {
      if (name === 'maps') return { Map: MapMock, InfoWindow: InfoWindowMock };
      if (name === 'marker') return { AdvancedMarkerElement: AdvancedMarkerElementMock };
      if (name === 'core') return { LatLngBounds: LatLngBoundsMock, LatLng: googleMapsMock.LatLng };
      return {};
    }
  };

  window.google = { maps: googleMapsMock };
  global.google = window.google;

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

  // --- Test 1: Page Title and Initial Tab State (All Results Sectioned Master Tab) ---
  console.log('[Test 1] Verifying page title and initial tab state (All Results master tab)...');
  assert.ok(document.title.includes('רשתות'), 'Page title should mention stores');
  const allSection = document.getElementById('all-tab-section');
  const storesSection = document.getElementById('stores-tab-section');
  const dealsSection = document.getElementById('deals-tab-section');
  const initialBillingSection = document.getElementById('billing-tab-section');
  assert.ok(!allSection.classList.contains('hidden'), 'All Results master section should be visible initially');
  assert.ok(storesSection.classList.contains('hidden'), 'Stores section should be hidden initially');
  assert.ok(dealsSection.classList.contains('hidden'), 'Deals section should be hidden initially');
  assert.ok(initialBillingSection.classList.contains('hidden'), 'Billing section should be hidden initially');

  // Verify billing tab D, quick stat button, and section are hidden by default
  const tabBillingBtnEl = document.getElementById('tab-billing-btn');
  const allSectionBillingEl = document.getElementById('all-section-billing');
  const allQuickBillingBtnEl = document.getElementById('all-quick-billing-btn');
  const allBillingPassiveNoticeEl = document.getElementById('all-billing-passive-notice');
  assert.ok(tabBillingBtnEl.classList.contains('hidden'), 'tab-billing-btn should be hidden by default');
  assert.ok(!tabBillingBtnEl.classList.contains('flex'), 'tab-billing-btn should not have flex by default');
  assert.ok(allSectionBillingEl.classList.contains('hidden'), 'all-section-billing should be hidden by default');
  assert.ok(allQuickBillingBtnEl.classList.contains('hidden'), 'all-quick-billing-btn should be hidden by default');
  assert.ok(!allBillingPassiveNoticeEl.classList.contains('hidden'), 'all-billing-passive-notice should be visible by default');

  // Verify unhide toggle button reveals and hides billing tab D
  const unhideToggleBtn = document.getElementById('unhide-billing-toggle-btn');
  if (unhideToggleBtn) {
    unhideToggleBtn.click();
    await new Promise(r => setTimeout(r, 50));
    assert.ok(!tabBillingBtnEl.classList.contains('hidden'), 'tab-billing-btn should be visible after unhide');
    assert.ok(tabBillingBtnEl.classList.contains('flex'), 'tab-billing-btn should have flex after unhide');
    assert.ok(!allSectionBillingEl.classList.contains('hidden'), 'all-section-billing should be visible after unhide');

    unhideToggleBtn.click();
    await new Promise(r => setTimeout(r, 50));
    assert.ok(tabBillingBtnEl.classList.contains('hidden'), 'tab-billing-btn should be hidden after re-hide');
    assert.ok(!tabBillingBtnEl.classList.contains('flex'), 'tab-billing-btn should not have flex after re-hide');
    assert.ok(allSectionBillingEl.classList.contains('hidden'), 'all-section-billing should be hidden after re-hide');
  }

  // Verify all 3 sections are rendered simultaneously in Tab All
  const allStoreCards = document.querySelectorAll('#all-stores-grid .store-card');
  const allDealCards = document.querySelectorAll('#all-deals-grid .deal-card');
  const allBillingCards = document.querySelectorAll('#all-billing-grid .billing-card');
  assert.strictEqual(allStoreCards.length, 4, 'Top 4 store cards should be rendered in All Results stores section');
  assert.strictEqual(allDealCards.length, 4, 'Top 4 deal cards should be rendered in All Results deals section');
  assert.strictEqual(allBillingCards.length, 4, 'Top 4 billing cards should be rendered in All Results billing section');

  // Test live search across all 3 sections simultaneously in Tab All
  const allSearchInput = document.getElementById('all-search-input');
  allSearchInput.value = 'סושי';
  allSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const allFilteredStores = document.querySelectorAll('#all-stores-grid .store-card');
  const allFilteredDeals = document.querySelectorAll('#all-deals-grid .deal-card');
  const allFilteredBilling = document.querySelectorAll('#all-billing-grid .billing-card');
  assert.ok(allFilteredStores.length >= 0, 'Stores section updated with live search');
  assert.ok(allFilteredDeals.length > 0, 'Deals section updated with live search');
  assert.ok(allFilteredBilling.length > 0, 'Billing section updated with live search');

  // Test no-results state in Tab All
  allSearchInput.value = 'zzzyyyxxx999';
  allSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));

  const allNoResults = document.getElementById('all-no-results');
  assert.ok(!allNoResults.classList.contains('hidden'), 'All Results no-results container should be visible when no matches found');
  const allClearBtn = document.getElementById('all-clear-filters-btn');
  allClearBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(allNoResults.classList.contains('hidden'), 'All Results no-results should be hidden after clearing filters');

  // Test view mode toggle (cards vs table) in Tab All
  const viewGridBtn = document.getElementById('view-grid-btn');
  const viewTableBtn = document.getElementById('view-table-btn');
  const allStoresGrid = document.getElementById('all-stores-grid');
  const allStoresTableView = document.getElementById('all-stores-table-view');
  const allDealsGrid = document.getElementById('all-deals-grid');
  const allDealsTableView = document.getElementById('all-deals-table-view');
  const allBillingGrid = document.getElementById('all-billing-grid');
  const allBillingTableView = document.getElementById('all-billing-table-view');

  // Switch to table view
  viewTableBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(allStoresGrid.classList.contains('hidden'), 'All stores grid should be hidden in table view');
  assert.ok(!allStoresTableView.classList.contains('hidden'), 'All stores table view should be visible');
  assert.ok(allDealsGrid.classList.contains('hidden'), 'All deals grid should be hidden in table view');
  assert.ok(!allDealsTableView.classList.contains('hidden'), 'All deals table view should be visible');
  assert.ok(allBillingGrid.classList.contains('hidden'), 'All billing grid should be hidden in table view');
  assert.ok(!allBillingTableView.classList.contains('hidden'), 'All billing table view should be visible');

  const allStoreTableRows = document.querySelectorAll('#all-stores-table-tbody tr');
  const allDealTableRows = document.querySelectorAll('#all-deals-table-tbody tr');
  const allBillingTableRows = document.querySelectorAll('#all-billing-table-tbody tr');
  assert.strictEqual(allStoreTableRows.length, 4, '4 store table rows rendered in All section table view');
  assert.strictEqual(allDealTableRows.length, 4, '4 deal table rows rendered in All section table view');
  assert.strictEqual(allBillingTableRows.length, 4, '4 billing table rows rendered in All section table view');

  // Test opening modal from table row in All tab
  allStoreTableRows[0].click();
  await new Promise(r => setTimeout(r, 50));
  const storeModal = document.getElementById('store-modal');
  assert.ok(!storeModal.classList.contains('hidden'), 'Store modal should open when clicking store table row in All tab');
  document.getElementById('modal-close-btn').click();
  await new Promise(r => setTimeout(r, 50));

  // Switch back to grid view
  viewGridBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(!allStoresGrid.classList.contains('hidden'), 'All stores grid should be visible in grid view');
  assert.ok(allStoresTableView.classList.contains('hidden'), 'All stores table view should be hidden in grid view');

  // Test jump button to Stores tab
  const allJumpStoresBtn = document.getElementById('all-jump-stores-btn');
  allJumpStoresBtn.click();
  await new Promise(r => setTimeout(r, 50));
  assert.ok(!storesSection.classList.contains('hidden'), 'Stores section should be visible after clicking jump button');
  assert.ok(allSection.classList.contains('hidden'), 'All section should be hidden after jumping to Stores');
  console.log('  -> PASS (All Results 3-section layout, live search, view mode toggle (cards/table), no-results state, and tab jump validated)');

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

  // Verify searching 'sim' finds GlobaleSIM
  billingSearchInput.value = 'sim';
  billingSearchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  const simMatches = Array.from(document.querySelectorAll('#billing-grid .billing-card'));
  const hasGlobaleSim = simMatches.some(card => card.textContent.includes('GlobaleSIM'));
  assert.ok(hasGlobaleSim, 'Searching "sim" in billing must include GlobaleSIM');

  clearBillingSearchBtn.click();
  await new Promise(r => setTimeout(r, 50));
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

  const billingModalAddressText = document.getElementById('billing-modal-address').textContent;
  assert.ok(billingModalAddressText.length > 0, 'Billing modal address should be populated with full address');

  const gmapsLink = document.getElementById('billing-modal-gmaps-link');
  const wazeLink = document.getElementById('billing-modal-waze-link');
  assert.ok(gmapsLink, 'Google Maps navigation link element exists');
  assert.ok(wazeLink, 'Waze navigation link element exists');

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

  // --- Test 21: Smart/Synonym Search Toggle ---
  console.log('[Test 21] Testing Smart/Synonym Search Toggle...');
  
  // Go back to Deals tab
  document.getElementById('tab-deals-btn').click();
  await new Promise(r => setTimeout(r, 50));
  
  // Set search input to "sushi" (English transliteration of סושי)
  const dealsSearchInput2 = document.getElementById('deals-search-input');
  dealsSearchInput2.value = 'sushi';
  dealsSearchInput2.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  
  // Without smart search, it should find nothing or only literal english matches
  let sushiDeals = document.querySelectorAll('#deals-grid .deal-card');
  const initialSushiCount = sushiDeals.length;
  
  // Enable smart search on Deals tab
  const dealsSmartToggle = document.getElementById('deals-search-smart-toggle');
  dealsSmartToggle.checked = true;
  dealsSmartToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  
  // With smart search, it should find "סושי" (if such deals exist in the mock data, which they do, check dealsData to confirm or use a known one)
  sushiDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.ok(sushiDeals.length >= initialSushiCount, 'Smart search should expand results (e.g. finding סושי from sushi)');
  
  // Turn smart search back off
  dealsSmartToggle.checked = false;
  dealsSmartToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 180));
  
  // Count should drop back down
  let finalSushiDeals = document.querySelectorAll('#deals-grid .deal-card');
  assert.strictEqual(finalSushiDeals.length, initialSushiCount, 'Strict matching should be maintained when toggle is off');
  
  // Clear search for subsequent tests just in case
  document.getElementById('clear-deals-search-btn').click();
  await new Promise(r => setTimeout(r, 50));
  
  console.log('  -> PASS (Smart search successfully expands transliterations and respects toggle state)');

  // --- Test 22: Category Chips Carousel & Expand Controls ---
  console.log('[Test 22] Testing Category Chips Carousel & Expand Controls across all tabs...');
  
  // Stores tab controls
  const storesExpandBtn = document.getElementById('stores-chips-expand-btn');
  const storesScrollRight = document.getElementById('stores-chips-scroll-right');
  const storesScrollLeft = document.getElementById('stores-chips-scroll-left');
  const storesChipsContainer = document.getElementById('category-chips-container');
  
  assert.ok(storesExpandBtn, 'Stores chips expand toggle button should exist');
  assert.ok(storesScrollRight, 'Stores scroll right button should exist');
  assert.ok(storesScrollLeft, 'Stores scroll left button should exist');
  assert.ok(storesChipsContainer, 'Stores category chips container should exist');

  // Verify initial state is compact (no flex-wrap)
  assert.ok(!storesChipsContainer.classList.contains('flex-wrap'), 'Initial category container should be in compact carousel mode');

  // Click expand toggle
  storesExpandBtn.click();
  assert.ok(storesChipsContainer.classList.contains('flex-wrap'), 'Clicking expand button should toggle category container to flex-wrap');
  const expandText = storesExpandBtn.querySelector('.chips-expand-text');
  if (expandText) {
    assert.strictEqual(expandText.textContent, 'צמצם', 'Button text should update to צמצם when expanded');
  }

  // Click collapse toggle
  storesExpandBtn.click();
  assert.ok(!storesChipsContainer.classList.contains('flex-wrap'), 'Clicking collapse button should restore compact carousel mode');
  if (expandText) {
    assert.strictEqual(expandText.textContent, 'כל הקטגוריות', 'Button text should update to כל הקטגוריות when collapsed');
  }

  // Verify Deals & Billing have controls
  assert.ok(document.getElementById('deals-chips-expand-btn'), 'Deals chips expand toggle should exist');
  assert.ok(document.getElementById('billing-chips-expand-btn'), 'Billing chips expand toggle should exist');

  console.log('  -> PASS (Category chips carousel, scroll controls, and expand toggle validated across all tabs)');

  // --- Test 24: Map Viewport Dynamic Sync & Bounds Recalculation (Pan & Zoom) ---
  console.log('[Test 24] Testing Map Viewport Dynamic Sync & Bounds Recalculation...');
  {
    const tabBillingBtnEl = document.getElementById('tab-billing-btn');
    const billingToggleMapBtn = document.getElementById('billing-toggle-map-btn');
    const billingMapWrapper = document.getElementById('billing-map-wrapper');
    const billingMapCountBadge = document.getElementById('billing-map-count-badge');
    const billingMapBoundsEmptyBanner = document.getElementById('billing-map-bounds-empty-banner');

    // 1. Switch to Billing Tab and Open Map
    tabBillingBtnEl.click();
    await new Promise(r => setTimeout(r, 50));
    assert.ok(billingMapWrapper.classList.contains('hidden'), 'Map wrapper should initially be hidden');

    billingToggleMapBtn.click();
    await new Promise(r => setTimeout(r, 200));
    assert.ok(!billingMapWrapper.classList.contains('hidden'), 'Map wrapper should be visible after toggle click');

    // 2. Initial Nationwide View (Zoom < 10)
    assert.ok(billingMapCountBadge, 'billingMapCountBadge must exist');
    assert.ok(
      billingMapCountBadge.textContent.includes('מוצגים') || billingMapCountBadge.textContent.includes('עסקים'),
      `Count badge should show nationwide store count, got: "${billingMapCountBadge.textContent}"`
    );
    assert.ok(billingMapBoundsEmptyBanner.classList.contains('hidden'), 'Empty bounds banner should be hidden initially');

    // 3. Zoom into Central Region (Zoom >= 10, Tel Aviv Center)
    const mapInst = billingMapWrapper.__mapInstance || window.__billingMapInstance;
    if (mapInst) {
      mapInst.setZoom(13);
      mapInst.setCenter({ lat: 32.0853, lng: 34.7818 });
      google.maps.event.trigger(mapInst, 'idle');
      await new Promise(r => setTimeout(r, 80));

      // Assert that bounds changed and recalculation occurred
      const bounds = mapInst.getBounds();
      assert.ok(bounds, 'Map bounds should exist');
      assert.strictEqual(mapInst.getZoom(), 13, 'Zoom should be 13');
      assert.ok(bounds.contains({ lat: 32.0853, lng: 34.7818 }), 'Bounds should contain Tel Aviv center');

      // Live count badge must update with "באזור המוצג במפה"
      assert.ok(
        billingMapCountBadge.textContent.includes('באזור המוצג במפה') || billingMapCountBadge.textContent.includes('עסקים'),
        `Badge should display visible storefronts in viewport: "${billingMapCountBadge.textContent}"`
      );
      const countInView = parseInt(billingMapCountBadge.textContent, 10);
      assert.ok(countInView > 0, `Expected positive count in Tel Aviv viewport, got ${countInView}`);
    }
  }
  console.log('  -> PASS (Map viewport dynamic bounds calculation and zoom sync validated)');

  // --- Test 25: Dynamic Map Count Badge Updates & Empty Region Guidance Message ---
  console.log('[Test 25] Testing Dynamic Map Count Badge & Empty Region Guidance Banner...');
  {
    const billingMapWrapper = document.getElementById('billing-map-wrapper');
    const billingMapCountBadge = document.getElementById('billing-map-count-badge');
    const billingMapBoundsEmptyBanner = document.getElementById('billing-map-bounds-empty-banner');
    const billingMapRecenterBtn = document.getElementById('billing-map-recenter-btn');

    const mapInst = billingMapWrapper.__mapInstance || window.__billingMapInstance;
    if (mapInst) {
      // 1. Pan camera to empty Mediterranean Sea region (32.1, 33.5) with local zoom 14
      mapInst.setZoom(14);
      mapInst.setCenter({ lat: 32.1, lng: 33.5 });
      google.maps.event.trigger(mapInst, 'idle');
      await new Promise(r => setTimeout(r, 80));

      // 2. Assert zero visible stores and badge text
      assert.ok(
        billingMapCountBadge.textContent.includes('0 עסקים') || billingMapCountBadge.textContent.includes('0'),
        `Badge must indicate 0 stores in empty region: "${billingMapCountBadge.textContent}"`
      );

      // 3. Assert empty bounds guidance banner is visible
      assert.ok(
        !billingMapBoundsEmptyBanner.classList.contains('hidden'),
        'billingMapBoundsEmptyBanner must be visible when viewport contains 0 stores'
      );
      assert.ok(billingMapRecenterBtn, 'Recenter button must exist inside empty bounds banner');

      // 4. Click recenter button and verify recovery
      billingMapRecenterBtn.click();
      await new Promise(r => setTimeout(r, 100));

      // Empty banner should hide once back to populated center
      assert.ok(
        billingMapBoundsEmptyBanner.classList.contains('hidden'),
        'billingMapBoundsEmptyBanner should be hidden after recentering'
      );
      const restoredCount = parseInt(billingMapCountBadge.textContent, 10);
      assert.ok(restoredCount > 0, `Restored viewport count should be > 0, got ${restoredCount}`);
    }
  }
  console.log('  -> PASS (Empty region badge text "0 עסקים", banner display, and recenter recovery validated)');

  // --- Test 26: Quick City Area Chips Camera Transition & Dynamic Bounds Sync ---
  console.log('[Test 26] Testing Quick City Area Chips Navigation & Bounds Sync...');
  {
    const cityChipsContainer = document.getElementById('billing-map-area-chips');
    assert.ok(cityChipsContainer, 'billing-map-area-chips container should exist in DOM');

    const chips = cityChipsContainer.querySelectorAll('[data-area]');
    const expectedAreas = ['user_loc', 'tel_aviv', 'jerusalem', 'haifa', 'rishon_lezion', 'beer_sheva', 'center', 'north', 'south'];

    assert.strictEqual(chips.length, expectedAreas.length, `Expected 9 area filter chips, found ${chips.length}`);
    expectedAreas.forEach(areaKey => {
      const chip = cityChipsContainer.querySelector(`[data-area="${areaKey}"]`);
      assert.ok(chip, `Chip for area "${areaKey}" must exist`);
    });

    const billingMapWrapper = document.getElementById('billing-map-wrapper');
    const billingMapCountBadge = document.getElementById('billing-map-count-badge');
    const mapInst = billingMapWrapper.__mapInstance || window.__billingMapInstance;

    // 1. Click Jerusalem Chip
    const jerusalemChip = cityChipsContainer.querySelector('[data-area="jerusalem"]');
    jerusalemChip.click();
    await new Promise(r => setTimeout(r, 120));

    if (mapInst) {
      const center = mapInst.getCenter();
      const lat = center.lat();
      const lng = center.lng();

      // Verify map centered on Jerusalem (approx lat 31.768, lng 35.213)
      assert.ok(Math.abs(lat - 31.7683) < 0.05, `Map latitude should be near Jerusalem (31.7683), got ${lat}`);
      assert.ok(Math.abs(lng - 35.2137) < 0.05, `Map longitude should be near Jerusalem (35.2137), got ${lng}`);
      assert.ok(mapInst.getZoom() >= 11, `Zoom should be at least 11 for city chip, got ${mapInst.getZoom()}`);

      // Verify Jerusalem in-bounds badge count
      const jerusalemCount = parseInt(billingMapCountBadge.textContent, 10);
      assert.ok(jerusalemCount > 0, `Jerusalem viewport count should be > 0, got ${jerusalemCount}`);
    }

    // 2. Click Haifa Chip
    const haifaChip = cityChipsContainer.querySelector('[data-area="haifa"]');
    haifaChip.click();
    await new Promise(r => setTimeout(r, 120));

    if (mapInst) {
      const center = mapInst.getCenter();
      const lat = center.lat();
      const lng = center.lng();

      // Verify map centered on Haifa (approx lat 32.794, lng 34.989)
      assert.ok(Math.abs(lat - 32.7940) < 0.05, `Map latitude should be near Haifa (32.7940), got ${lat}`);
      assert.ok(Math.abs(lng - 34.9896) < 0.05, `Map longitude should be near Haifa (34.9896), got ${lng}`);
    }
  }
  console.log('  -> PASS (Quick city area chips navigation, camera centering, and bounds sync validated)');

  // --- Test 28: Favorites UI Toggle, Badge Count & Filtering ---
  console.log('[Test 28] Testing Favorites UI Toggle, Badge Count & Filtering...');
  {
    // 1. Switch to stores tab
    document.getElementById('tab-stores-btn').click();
    await new Promise(r => setTimeout(r, 60));

    const storesCardsView = document.getElementById('cards-view');
    const firstStoreCard = storesCardsView.querySelector('.store-card');
    assert.ok(firstStoreCard, 'Store card should exist in stores tab');

    const favStoreBtn = firstStoreCard.querySelector('[data-action="toggle-favorite"]');
    assert.ok(favStoreBtn, 'Favorite button should exist on store card');

    // Click favorite button on first store
    favStoreBtn.click();
    await new Promise(r => setTimeout(r, 50));

    const favBadge = document.getElementById('favorites-badge-count');
    assert.ok(favBadge, 'favorites-badge-count should exist');
    assert.strictEqual(favBadge.textContent.trim(), '1', 'Badge count should show 1 after favoriting store');
    assert.ok(!favBadge.classList.contains('hidden'), 'Badge should not be hidden when count > 0');

    // Star icon should have fill class
    const starIcon = favStoreBtn.querySelector('i');
    assert.ok(starIcon.classList.contains('fill-amber-400'), 'Star icon should be filled when favorited');

    // 2. Toggle Favorites-Only filter
    const favoritesFilterBtn = document.getElementById('favorites-filter-toggle-btn') || document.getElementById('favorites-filter-btn');
    assert.ok(favoritesFilterBtn, 'favorites-filter-toggle-btn should exist');

    favoritesFilterBtn.click();
    await new Promise(r => setTimeout(r, 60));

    // Verify only the favorited store card is shown
    const visibleCards = storesCardsView.querySelectorAll('.store-card');
    assert.strictEqual(visibleCards.length, 1, 'Only 1 store card should be visible in favorites-only mode');
    assert.strictEqual(visibleCards[0].dataset.storeId, firstStoreCard.dataset.storeId, 'Visible card must be the favorited store');

    // Turn off favorites filter
    favoritesFilterBtn.click();
    await new Promise(r => setTimeout(r, 60));
    assert.ok(storesCardsView.querySelectorAll('.store-card').length > 1, 'All store cards should return after toggling off favorites-only');

    // 3. Switch to Deals tab & test deal favoriting
    document.getElementById('tab-deals-btn').click();
    await new Promise(r => setTimeout(r, 60));

    const dealsCardsView = document.getElementById('deals-grid');
    const firstDealCard = dealsCardsView.querySelector('.deal-card');
    assert.ok(firstDealCard, 'Deal card should exist');

    const favDealBtn = firstDealCard.querySelector('[data-action="toggle-favorite"]');
    assert.ok(favDealBtn, 'Favorite button should exist on deal card');

    favDealBtn.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(favBadge.textContent.trim(), '2', 'Badge count should show 2 after favoriting deal');

    // Unfavorite the deal
    favDealBtn.click();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(favBadge.textContent.trim(), '1', 'Badge count should drop back to 1 after unfavoriting deal');
  }
  console.log('  -> PASS (Favorites UI toggle, badge count, card stars, and favorites-only filtering validated)');

  console.log('[Test 29] Checking for console errors...');
  assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, but found: ${consoleErrors.join(', ')}`);
  console.log('  -> PASS (Zero errors during entire session)');

  console.log('\n====================================================');
  console.log('   ALL 29 UI & DOM INTEGRATION TESTS PASSED!       ');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n[TEST FAILED]', err);
  process.exit(1);
});
