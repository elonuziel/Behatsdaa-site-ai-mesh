/**
 * Behatsdaa Multi-Card Participating Stores, Deals & Billing Discounts Web Application
 * ES Module Entry Point
 */

import { state } from './js/state.js';
import { debounce, initTheme, toggleTheme } from './js/utils.js';
import { loadStores, loadDeals, loadBilling, crossLinkAllDatasets, fetchWalletsInfo } from './js/data.js';
import { populateCardsFilter, updateCategoryChips, getFilteredStores, createStoreCardElement, createStoreTableRow, openStoreModal, closeStoreModal } from './js/stores.js';
import { populateDealsTagsFilter, updateDealsCategoryChips, getFilteredDeals, createDealCardElement, createDealTableRow, openDealModal, closeDealModal } from './js/deals.js';
import { populateBillingCitiesFilter, updateBillingCategoryChips, getFilteredBillingStores, createBillingCardElement, createBillingTableRow, openBillingModal, closeBillingModal } from './js/billing.js';
import { initBillingMap, updateMapMarkers, centerOnUserLocation, toggleMapMaximize, isMapReady, recenterMapToAllMarkers, setMapCallbacks } from './js/map.js';

// DOM Elements - Navigation Tabs
const tabAllBtn = document.getElementById('tab-all-btn');
const tabStoresBtn = document.getElementById('tab-stores-btn');
const tabDealsBtn = document.getElementById('tab-deals-btn');
const tabBillingBtn = document.getElementById('tab-billing-btn');
const unhideBillingToggleBtn = document.getElementById('unhide-billing-toggle-btn');
const unhideBillingToggleText = document.getElementById('unhide-billing-toggle-text');
const allUnhideBillingBtn = document.getElementById('all-unhide-billing-btn');
const allBillingPassiveNotice = document.getElementById('all-billing-passive-notice');
const billingHiddenWarningModal = document.getElementById('billing-hidden-warning-modal');
const billingWarningCloseBtn = document.getElementById('billing-warning-close-btn');
const billingWarningDismissBtn = document.getElementById('billing-warning-dismiss-btn');
const billingWarningUnhideBtn = document.getElementById('billing-warning-unhide-btn');
const tabAllCount = document.getElementById('tab-all-count');
const tabStoresCount = document.getElementById('tab-stores-count');
const tabDealsCount = document.getElementById('tab-deals-count');
const tabBillingCount = document.getElementById('tab-billing-count');
const allTabSection = document.getElementById('all-tab-section');
const storesTabSection = document.getElementById('stores-tab-section');
const dealsTabSection = document.getElementById('deals-tab-section');
const billingTabSection = document.getElementById('billing-tab-section');
const viewModeToggleWrapper = document.getElementById('view-mode-toggle-wrapper');

// DOM Elements - All Results Tab
const allSearchInput = document.getElementById('all-search-input');
const clearAllSearchBtn = document.getElementById('clear-all-search-btn');
const allSearchDescToggle = document.getElementById('all-search-desc-toggle');
const allQuickStoresBtn = document.getElementById('all-quick-stores-btn');
const allQuickDealsBtn = document.getElementById('all-quick-deals-btn');
const allQuickBillingBtn = document.getElementById('all-quick-billing-btn');
const allQuickStoresCount = document.getElementById('all-quick-stores-count');
const allQuickDealsCount = document.getElementById('all-quick-deals-count');
const allQuickBillingCount = document.getElementById('all-quick-billing-count');
const allMatchingCountEl = document.getElementById('all-matching-count');
const allActiveFilterBadge = document.getElementById('all-active-filter-badge');
const allActiveFilterText = document.getElementById('all-active-filter-text');
const allResetFiltersBtn = document.getElementById('all-reset-filters-btn');
const allWalletsGuideBtn = document.getElementById('all-wallets-guide-btn');
const allTabSpinner = document.getElementById('all-tab-spinner');
const allSectionStores = document.getElementById('all-section-stores');
const allStoresBadge = document.getElementById('all-stores-badge');
const allJumpStoresBtn = document.getElementById('all-jump-stores-btn');
const allJumpStoresText = document.getElementById('all-jump-stores-text');
const allStoresGrid = document.getElementById('all-stores-grid');
const allStoresEmpty = document.getElementById('all-stores-empty');
const allSectionDeals = document.getElementById('all-section-deals');
const allDealsBadge = document.getElementById('all-deals-badge');
const allJumpDealsBtn = document.getElementById('all-jump-deals-btn');
const allJumpDealsText = document.getElementById('all-jump-deals-text');
const allDealsGrid = document.getElementById('all-deals-grid');
const allDealsEmpty = document.getElementById('all-deals-empty');
const allSectionBilling = document.getElementById('all-section-billing');
const allBillingBadge = document.getElementById('all-billing-badge');
const allJumpBillingBtn = document.getElementById('all-jump-billing-btn');
const allJumpBillingText = document.getElementById('all-jump-billing-text');
const allBillingGrid = document.getElementById('all-billing-grid');
const allStoresTableView = document.getElementById('all-stores-table-view');
const allStoresTableTbody = document.getElementById('all-stores-table-tbody');
const allDealsTableView = document.getElementById('all-deals-table-view');
const allDealsTableTbody = document.getElementById('all-deals-table-tbody');
const allBillingTableView = document.getElementById('all-billing-table-view');
const allBillingTableTbody = document.getElementById('all-billing-table-tbody');
const allBillingEmpty = document.getElementById('all-billing-empty');
const allNoResults = document.getElementById('all-no-results');
const allClearFiltersBtn = document.getElementById('all-clear-filters-btn');

// DOM Elements - Stores
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const storesSearchDescToggle = document.getElementById('stores-search-desc-toggle');
const cardFilterSelect = document.getElementById('card-filter-select');
const sortSelect = document.getElementById('sort-select');
const categoryChipsContainer = document.getElementById('category-chips-container');
const matchingCountEl = document.getElementById('matching-count');
const totalCountEl = document.getElementById('total-count');
const activeFilterBadge = document.getElementById('active-filter-badge');
const activeFilterText = document.getElementById('active-filter-text');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const lastUpdatedDateEl = document.getElementById('last-updated-date');

const cardsView = document.getElementById('cards-view');
const tableView = document.getElementById('table-view');
const tableTbody = document.getElementById('table-tbody');
const noResultsEl = document.getElementById('no-results');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

const viewGridBtn = document.getElementById('view-grid-btn');
const viewTableBtn = document.getElementById('view-table-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const storesLoadMoreContainer = document.getElementById('stores-load-more-container');
const storesLoadMoreBtn = document.getElementById('stores-load-more-btn');

// DOM Elements - Store Modal
const storeModalElements = {
  storeModal: document.getElementById('store-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalDismissBtn: document.getElementById('modal-dismiss-btn'),
  modalLogo: document.getElementById('modal-logo'),
  modalCategory: document.getElementById('modal-category'),
  modalTitle: document.getElementById('modal-title'),
  modalWebsiteLink: document.getElementById('modal-website-link'),
  modalCardsList: document.getElementById('modal-cards-list'),
  modalConditions: document.getElementById('modal-conditions'),
  modalLinkedDealBanner: document.getElementById('modal-linked-deal-banner'),
  modalViewDealBtn: document.getElementById('modal-view-deal-btn'),
  modalLinkedBillingBanner: document.getElementById('modal-linked-billing-banner'),
  modalLinkedBillingTitle: document.getElementById('modal-linked-billing-title'),
  modalViewBillingBtn: document.getElementById('modal-view-billing-btn'),
};

// DOM Elements - Wallets Terms & Caps Guide Modal
const walletsGuideBtn = document.getElementById('wallets-guide-btn');
const storeModalWalletsInfoBtn = document.getElementById('store-modal-wallets-info-btn');
const walletsModal = document.getElementById('wallets-modal');
const walletsModalCloseBtn = document.getElementById('wallets-modal-close-btn');
const walletsModalDismissBtn = document.getElementById('wallets-modal-dismiss-btn');
const walletsModalCardsGrid = document.getElementById('wallets-modal-cards-grid');

// DOM Elements - Deals
const dealsSearchInput = document.getElementById('deals-search-input');
const clearDealsSearchBtn = document.getElementById('clear-deals-search-btn');
const dealsSearchDescToggle = document.getElementById('deals-search-desc-toggle');
const dealsTagSelect = document.getElementById('deals-tag-select');
const dealsPriceFilterSelect = document.getElementById('deals-price-filter-select');
const dealsSortSelect = document.getElementById('deals-sort-select');
const dealsCategoryChipsContainer = document.getElementById('deals-category-chips-container');
const matchingDealsCountEl = document.getElementById('matching-deals-count');
const totalDealsCountEl = document.getElementById('total-deals-count');
const activeDealsFilterBadge = document.getElementById('active-deals-filter-badge');
const activeDealsFilterText = document.getElementById('active-deals-filter-text');
const resetDealsFiltersBtn = document.getElementById('reset-deals-filters-btn');
const dealsLastUpdatedDateEl = document.getElementById('deals-last-updated-date');
const dealsGrid = document.getElementById('deals-grid');
const dealsTableView = document.getElementById('deals-table-view');
const dealsTableTbody = document.getElementById('deals-table-tbody');
const dealsTabSpinner = document.getElementById('deals-tab-spinner');
const noDealsResults = document.getElementById('no-deals-results');
const clearDealsFiltersBtn = document.getElementById('clear-deals-filters-btn');
const dealsLoadMoreContainer = document.getElementById('deals-load-more-container');
const dealsLoadMoreBtn = document.getElementById('deals-load-more-btn');

// DOM Elements - Deal Modal
const dealModalElements = {
  dealModal: document.getElementById('deal-modal'),
  dealModalCloseBtn: document.getElementById('deal-modal-close-btn'),
  dealModalDismissBtn: document.getElementById('deal-modal-dismiss-btn'),
  dealModalImg: document.getElementById('deal-modal-img'),
  dealModalCategory: document.getElementById('deal-modal-category'),
  dealModalTag: document.getElementById('deal-modal-tag'),
  dealModalTitle: document.getElementById('deal-modal-title'),
  dealModalSupplier: document.getElementById('deal-modal-supplier'),
  dealModalPrice: document.getElementById('deal-modal-price'),
  dealModalPriceLabel: document.getElementById('deal-modal-price-label'),
  dealModalOrigPrice: document.getElementById('deal-modal-orig-price'),
  dealModalSavingsBadge: document.getElementById('deal-modal-savings-badge'),
  dealModalSavingsText: document.getElementById('deal-modal-savings-text'),
  dealModalVariantsSection: document.getElementById('deal-modal-variants-section'),
  dealModalVariantsList: document.getElementById('deal-modal-variants-list'),
  dealModalDescription: document.getElementById('deal-modal-description'),
  dealModalTerms: document.getElementById('deal-modal-terms'),
  dealModalLocations: document.getElementById('deal-modal-locations'),
  dealModalExpiration: document.getElementById('deal-modal-expiration'),
  dealModalLimits: document.getElementById('deal-modal-limits'),
  dealModalLimitsWrapper: document.getElementById('deal-modal-limits-wrapper'),
  dealModalBuyLink: document.getElementById('deal-modal-buy-link'),
  dealModalLinkedStoreBanner: document.getElementById('deal-modal-linked-store-banner'),
  dealModalLinkedStoreTitle: document.getElementById('deal-modal-linked-store-title'),
  dealModalViewStoreBtn: document.getElementById('deal-modal-view-store-btn'),
  dealModalLinkedBillingBanner: document.getElementById('deal-modal-linked-billing-banner'),
  dealModalLinkedBillingTitle: document.getElementById('deal-modal-linked-billing-title'),
  dealModalViewBillingBtn: document.getElementById('deal-modal-view-billing-btn'),
};

// DOM Elements - Billing Discounts
const billingSearchInput = document.getElementById('billing-search-input');
const clearBillingSearchBtn = document.getElementById('clear-billing-search-btn');
const billingSearchDescToggle = document.getElementById('billing-search-desc-toggle');
const billingCitySelect = document.getElementById('billing-city-select');
const billingSortSelect = document.getElementById('billing-sort-select');
const billingCategoryChipsContainer = document.getElementById('billing-category-chips-container');
const matchingBillingCountEl = document.getElementById('matching-billing-count');
const totalBillingCountEl = document.getElementById('total-billing-count');
const activeBillingFilterBadge = document.getElementById('active-billing-filter-badge');
const activeBillingFilterText = document.getElementById('active-billing-filter-text');
const resetBillingFiltersBtn = document.getElementById('reset-billing-filters-btn');
const billingLastUpdatedDateEl = document.getElementById('billing-last-updated-date');
const billingGrid = document.getElementById('billing-grid');
const billingTableView = document.getElementById('billing-table-view');
const billingTableTbody = document.getElementById('billing-table-tbody');
const billingTabSpinner = document.getElementById('billing-tab-spinner');
const noBillingResults = document.getElementById('no-billing-results');
const clearBillingFiltersBtn = document.getElementById('clear-billing-filters-btn');
const billingLoadMoreContainer = document.getElementById('billing-load-more-container');
const billingLoadMoreBtn = document.getElementById('billing-load-more-btn');

// DOM Elements - Billing Google Maps
const billingToggleMapBtn = document.getElementById('billing-toggle-map-btn');
const billingToggleMapText = document.getElementById('billing-toggle-map-text');
const billingMapWrapper = document.getElementById('billing-map-wrapper');
const billingMapCanvas = document.getElementById('billing-map-canvas');
const billingMapLoading = document.getElementById('billing-map-loading');
const billingMapCountBadge = document.getElementById('billing-map-count-badge');
const billingMapLocateBtn = document.getElementById('billing-map-locate-btn');
const billingMapLocateText = document.getElementById('billing-map-locate-text');
const billingMapMaximizeBtn = document.getElementById('billing-map-maximize-btn');
const billingMapMaximizeIcon = document.getElementById('billing-map-maximize-icon');
const billingMapMaximizeText = document.getElementById('billing-map-maximize-text');
const billingMapCloseBtn = document.getElementById('billing-map-close-btn');
const billingMapCategoryFilter = document.getElementById('billing-map-category-filter');
const billingMapHighDiscountToggle = document.getElementById('billing-map-high-discount-toggle');
const billingMapEmptyOverlay = document.getElementById('billing-map-empty-overlay');
const billingMapEmptyText = document.getElementById('billing-map-empty-text');
const billingMapResetFiltersBtn = document.getElementById('billing-map-reset-filters-btn');
const billingMapErrorOverlay = document.getElementById('billing-map-error-overlay');
const billingMapErrorTitle = document.getElementById('billing-map-error-title');
const billingMapErrorDesc = document.getElementById('billing-map-error-desc');
const billingMapRetryBtn = document.getElementById('billing-map-retry-btn');
const billingMapBoundsEmptyBanner = document.getElementById('billing-map-bounds-empty-banner');
const billingMapRecenterBtn = document.getElementById('billing-map-recenter-btn');
const billingMapFilterSummary = document.getElementById('billing-map-filter-summary');
const billingMapClearToolbarFiltersBtn = document.getElementById('billing-map-clear-toolbar-filters-btn');

// DOM Elements - Billing Modal
const billingModalElements = {
  billingModal: document.getElementById('billing-modal'),
  billingModalCloseBtn: document.getElementById('billing-modal-close-btn'),
  billingModalDismissBtn: document.getElementById('billing-modal-dismiss-btn'),
  billingModalLogo: document.getElementById('billing-modal-logo'),
  billingModalCategory: document.getElementById('billing-modal-category'),
  billingModalCityBadge: document.getElementById('billing-modal-city-badge'),
  billingModalTitle: document.getElementById('billing-modal-title'),
  billingModalAddress: document.getElementById('billing-modal-address'),
  billingModalAddressWrapper: document.getElementById('billing-modal-address-wrapper'),
  billingModalDiscount: document.getElementById('billing-modal-discount'),
  billingModalLinkedStoreBanner: document.getElementById('billing-modal-linked-store-banner'),
  billingModalLinkedStoreTitle: document.getElementById('billing-modal-linked-store-title'),
  billingModalLinkedStoreMaxDisc: document.getElementById('billing-modal-linked-store-max-disc'),
  billingModalCardsList: document.getElementById('billing-modal-cards-list'),
  billingModalViewStoreBtn: document.getElementById('billing-modal-view-store-btn'),
  billingModalLinkedDealBanner: document.getElementById('billing-modal-linked-deal-banner'),
  billingModalLinkedDealTitle: document.getElementById('billing-modal-linked-deal-title'),
  billingModalDealsList: document.getElementById('billing-modal-deals-list'),
  billingModalViewDealBtn: document.getElementById('billing-modal-view-deal-btn'),
  billingModalDescription: document.getElementById('billing-modal-description'),
  billingModalOfficialLink: document.getElementById('billing-modal-official-link'),
};

function setBillingUnhidden(unhidden) {
  state.isBillingUnhidden = unhidden;
  try {
    localStorage.setItem('behatsdaa_billing_unhidden', unhidden ? 'true' : 'false');
  } catch (e) {}

  if (unhidden) {
    if (tabBillingBtn) {
      tabBillingBtn.classList.remove('hidden');
      tabBillingBtn.classList.add('flex');
    }
    if (allQuickBillingBtn) {
      allQuickBillingBtn.classList.remove('hidden');
      allQuickBillingBtn.classList.add('flex');
    }
    if (allSectionBilling) {
      allSectionBilling.classList.remove('hidden');
    }
    if (allBillingPassiveNotice) {
      allBillingPassiveNotice.classList.add('hidden');
    }
    if (unhideBillingToggleText) {
      unhideBillingToggleText.textContent = 'הסתר מעמד החיוב';
    }
    if (unhideBillingToggleBtn) {
      unhideBillingToggleBtn.classList.remove('bg-purple-50', 'text-purple-700', 'border-purple-200');
      unhideBillingToggleBtn.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
    }
    if (state.currentTab === 'all') {
      renderAllTab();
    }
  } else {
    if (tabBillingBtn) {
      tabBillingBtn.classList.add('hidden');
      tabBillingBtn.classList.remove('flex');
    }
    if (allQuickBillingBtn) {
      allQuickBillingBtn.classList.add('hidden');
      allQuickBillingBtn.classList.remove('flex');
    }
    if (allSectionBilling) {
      allSectionBilling.classList.add('hidden');
    }
    if (allBillingPassiveNotice) {
      allBillingPassiveNotice.classList.remove('hidden');
    }
    if (unhideBillingToggleText) {
      unhideBillingToggleText.textContent = 'הצג מעמד החיוב';
    }
    if (unhideBillingToggleBtn) {
      unhideBillingToggleBtn.classList.add('bg-purple-50', 'text-purple-700', 'border-purple-200');
      unhideBillingToggleBtn.classList.remove('bg-purple-600', 'text-white', 'border-purple-600');
    }
    if (state.currentTab === 'billing') {
      switchTab('all');
    } else if (state.currentTab === 'all') {
      renderAllTab();
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

let pendingWarningStore = null;

function showBillingHiddenWarning(targetStore = null) {
  pendingWarningStore = targetStore;
  if (billingHiddenWarningModal) {
    billingHiddenWarningModal.classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ root: billingHiddenWarningModal });
    }
  }
}

function closeBillingHiddenWarning() {
  if (billingHiddenWarningModal) {
    billingHiddenWarningModal.classList.add('hidden');
  }
}

function renderAllTab() {
  if (!allTabSection) return;

  const stores = getFilteredStores();
  const deals = state.dealsLoaded ? getFilteredDeals() : [];
  const billing = state.billingLoaded ? getFilteredBillingStores() : [];

  const totalAllMatches = stores.length + deals.length + billing.length;
  if (allMatchingCountEl) allMatchingCountEl.textContent = totalAllMatches.toLocaleString('he-IL');
  if (tabAllCount) tabAllCount.textContent = totalAllMatches.toLocaleString('he-IL');

  // Quick stats
  if (allQuickStoresCount) allQuickStoresCount.textContent = stores.length.toLocaleString('he-IL');
  if (allQuickDealsCount) allQuickDealsCount.textContent = (state.dealsLoaded ? deals.length : 0).toLocaleString('he-IL');
  if (allQuickBillingCount) allQuickBillingCount.textContent = (state.billingLoaded ? billing.length : 0).toLocaleString('he-IL');

  // Active filter badge
  const query = state.searchQuery || state.dealsSearchQuery || state.billingSearchQuery;
  const hasFilter = !!query || state.storesSearchInDesc;
  if (allActiveFilterBadge) allActiveFilterBadge.classList.toggle('hidden', !hasFilter);
  if (hasFilter && allActiveFilterText) {
    allActiveFilterText.textContent = `"${query}"${state.storesSearchInDesc ? ' (כולל תיאור)' : ''}`;
  }

  const isAllZero = (query && totalAllMatches === 0);
  if (allNoResults) allNoResults.classList.toggle('hidden', !isAllZero);
  if (allSectionStores) allSectionStores.classList.toggle('hidden', isAllZero);
  if (allSectionDeals) allSectionDeals.classList.toggle('hidden', isAllZero);
  if (allSectionBilling) allSectionBilling.classList.toggle('hidden', isAllZero || !state.isBillingUnhidden);

  // Update dynamic notice for billing results if tab is hidden
  const allBillingPassiveTitle = document.getElementById('all-billing-passive-title');
  const allBillingPassiveDesc = document.getElementById('all-billing-passive-desc');
  const allUnhideBillingBtnText = document.getElementById('all-unhide-billing-btn-text');

  if (allBillingPassiveNotice && !state.isBillingUnhidden) {
    if (query && billing.length > 0) {
      allBillingPassiveNotice.classList.remove('hidden');
      if (allBillingPassiveTitle) {
        allBillingPassiveTitle.textContent = `נמצאו ${billing.length.toLocaleString('he-IL')} עסקים בהנחת מעמד החיוב עבור "${query}"`;
      }
      if (allBillingPassiveDesc) {
        const topNames = billing.slice(0, 3).map(b => b.name).join(', ');
        allBillingPassiveDesc.textContent = `כולל: ${topNames}${billing.length > 3 ? ' ועוד...' : ''}. ההנחה מוחלת אוטומטית בעת תשלום בכרטיס האשראי של בהצדעה.`;
      }
      if (allUnhideBillingBtnText) {
        allUnhideBillingBtnText.textContent = `הצג ${billing.length.toLocaleString('he-IL')} תוצאות מעמד החיוב`;
      }
    } else {
      if (allBillingPassiveTitle) {
        allBillingPassiveTitle.textContent = 'הטבת מעמד החיוב (Max) - בונוס אוטומטי סביל';
      }
      if (allBillingPassiveDesc) {
        allBillingPassiveDesc.textContent = 'הנחה אוטומטית בדף החשבון בתשלום באשראי בהצדעה ב-10,000+ עסקים. הלשונית המלאה מוסתרת כברירת מחדל לשמירה על מהירות האתר.';
      }
      if (allUnhideBillingBtnText) {
        allUnhideBillingBtnText.textContent = 'הצג לשונית מעמד החיוב ומפה';
      }
    }
  }

  if (isAllZero) return;

  // Render Stores Section (Top 4)
  const topStores = stores.slice(0, 4);
  if (allStoresBadge) allStoresBadge.textContent = stores.length.toLocaleString('he-IL');
  if (allJumpStoresText) {
    allJumpStoresText.textContent = query 
      ? `הצג את כל ${stores.length.toLocaleString('he-IL')} הרשתות התואמות` 
      : `הצג את כל ${stores.length.toLocaleString('he-IL')} הרשתות`;
  }
  if (state.currentView === 'grid') {
    if (allStoresGrid) {
      allStoresGrid.innerHTML = '';
      topStores.forEach(s => allStoresGrid.appendChild(createStoreCardElement(s)));
      allStoresGrid.classList.remove('hidden');
    }
    if (allStoresTableView) allStoresTableView.classList.add('hidden');
  } else {
    if (allStoresTableTbody) {
      allStoresTableTbody.innerHTML = '';
      topStores.forEach(s => allStoresTableTbody.appendChild(createStoreTableRow(s)));
    }
    if (allStoresTableView) allStoresTableView.classList.remove('hidden');
    if (allStoresGrid) allStoresGrid.classList.add('hidden');
  }
  if (allStoresEmpty) allStoresEmpty.classList.toggle('hidden', stores.length > 0);

  // Render Deals Section (Top 4)
  const topDeals = deals.slice(0, 4);
  if (allDealsBadge) allDealsBadge.textContent = (state.dealsLoaded ? deals.length : 0).toLocaleString('he-IL');
  if (allJumpDealsText) {
    allJumpDealsText.textContent = query 
      ? `הצג את כל ${deals.length.toLocaleString('he-IL')} המבצעים התואמים` 
      : `הצג את כל ${deals.length.toLocaleString('he-IL')} המבצעים`;
  }
  if (state.currentView === 'grid') {
    if (allDealsGrid) {
      allDealsGrid.innerHTML = '';
      if (!state.dealsLoaded) {
        allDealsGrid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">טוען מבצעים ושוברים...</div>';
      } else {
        topDeals.forEach(d => allDealsGrid.appendChild(createDealCardElement(d)));
      }
      allDealsGrid.classList.remove('hidden');
    }
    if (allDealsTableView) allDealsTableView.classList.add('hidden');
  } else {
    if (allDealsTableTbody) {
      allDealsTableTbody.innerHTML = '';
      if (!state.dealsLoaded) {
        allDealsTableTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-xs text-slate-400">טוען מבצעים ושוברים...</td></tr>';
      } else {
        topDeals.forEach(d => allDealsTableTbody.appendChild(createDealTableRow(d)));
      }
    }
    if (allDealsTableView) allDealsTableView.classList.remove('hidden');
    if (allDealsGrid) allDealsGrid.classList.add('hidden');
  }
  if (allDealsEmpty) allDealsEmpty.classList.toggle('hidden', !state.dealsLoaded || deals.length > 0);

  // Render Billing Section (Top 4)
  const topBilling = billing.slice(0, 4);
  if (allBillingBadge) allBillingBadge.textContent = (state.billingLoaded ? billing.length : 0).toLocaleString('he-IL');
  if (allJumpBillingText) {
    allJumpBillingText.textContent = query 
      ? `הצג את כל ${billing.length.toLocaleString('he-IL')} העסקים התואמים` 
      : `הצג את כל ${billing.length.toLocaleString('he-IL')} העסקים`;
  }
  if (state.currentView === 'grid') {
    if (allBillingGrid) {
      allBillingGrid.innerHTML = '';
      if (!state.billingLoaded) {
        allBillingGrid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400">טוען הנחות במעמד החיוב (10,600+ עסקים)...</div>';
      } else {
        topBilling.forEach(b => allBillingGrid.appendChild(createBillingCardElement(b)));
      }
      allBillingGrid.classList.remove('hidden');
    }
    if (allBillingTableView) allBillingTableView.classList.add('hidden');
  } else {
    if (allBillingTableTbody) {
      allBillingTableTbody.innerHTML = '';
      if (!state.billingLoaded) {
        allBillingTableTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-xs text-slate-400">טוען הנחות במעמד החיוב (10,600+ עסקים)...</td></tr>';
      } else {
        topBilling.forEach(b => allBillingTableTbody.appendChild(createBillingTableRow(b)));
      }
    }
    if (allBillingTableView) allBillingTableView.classList.remove('hidden');
    if (allBillingGrid) allBillingGrid.classList.add('hidden');
  }
  if (allBillingEmpty) allBillingEmpty.classList.toggle('hidden', !state.billingLoaded || billing.length > 0);

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons({ root: allTabSection });
  }
}

function renderStores() {
  const filtered = getFilteredStores();
  matchingCountEl.textContent = filtered.length;

  const hasFilter = state.searchQuery || state.currentCard !== 'all' || state.currentCategory !== 'all' || (state.searchQuery && state.storesSearchInDesc);
  activeFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter) {
    const parts = [];
    if (state.searchQuery) parts.push(`"${state.searchQuery}"${state.storesSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentCard !== 'all') parts.push(state.currentCard);
    if (state.currentCategory !== 'all') parts.push(state.currentCategory);
    activeFilterText.textContent = parts.join(' • ');
  }

  if (filtered.length === 0) {
    cardsView.innerHTML = '';
    tableTbody.innerHTML = '';
    noResultsEl.classList.remove('hidden');
    if (storesLoadMoreContainer) storesLoadMoreContainer.classList.add('hidden');
    return;
  }

  noResultsEl.classList.add('hidden');

  const visibleStores = filtered.slice(0, state.storesVisibleCount);

  if (state.currentView === 'grid') {
    cardsView.innerHTML = '';
    visibleStores.forEach(s => cardsView.appendChild(createStoreCardElement(s)));
    cardsView.classList.remove('hidden');
    tableView.classList.add('hidden');
  } else {
    tableTbody.innerHTML = '';
    visibleStores.forEach(s => tableTbody.appendChild(createStoreTableRow(s)));
    tableView.classList.remove('hidden');
    cardsView.classList.add('hidden');
  }

  if (storesLoadMoreContainer) {
    storesLoadMoreContainer.classList.toggle('hidden', state.storesVisibleCount >= filtered.length);
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    const root = state.currentView === 'grid' ? cardsView : tableView;
    if (root) window.lucide.createIcons({ root });
  }
}

function renderDeals() {
  const filtered = getFilteredDeals();
  matchingDealsCountEl.textContent = filtered.length;

  const hasFilter = state.dealsSearchQuery || state.currentDealTag !== 'all' || state.currentDealCategory !== 'all' || state.currentDealMaxPrice !== 'all' || (state.dealsSearchQuery && state.dealsSearchInDesc);
  activeDealsFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter) {
    const parts = [];
    if (state.dealsSearchQuery) parts.push(`"${state.dealsSearchQuery}"${state.dealsSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentDealTag !== 'all') parts.push(state.currentDealTag);
    if (state.currentDealCategory !== 'all') parts.push(state.currentDealCategory);
    if (state.currentDealMaxPrice !== 'all') parts.push(state.currentDealMaxPrice === 'over-500' ? 'מעל 500 ₪' : `עד ${state.currentDealMaxPrice} ₪`);
    activeDealsFilterText.textContent = parts.join(' • ');
  }

  if (filtered.length === 0) {
    dealsGrid.innerHTML = '';
    if (dealsTableTbody) dealsTableTbody.innerHTML = '';
    noDealsResults.classList.remove('hidden');
    if (dealsTableView) dealsTableView.classList.add('hidden');
    if (dealsLoadMoreContainer) dealsLoadMoreContainer.classList.add('hidden');
    return;
  }

  noDealsResults.classList.add('hidden');

  const visibleDeals = filtered.slice(0, state.dealsVisibleCount);
  if (state.currentView === 'grid') {
    dealsGrid.innerHTML = '';
    visibleDeals.forEach(d => dealsGrid.appendChild(createDealCardElement(d)));
    dealsGrid.classList.remove('hidden');
    if (dealsTableView) dealsTableView.classList.add('hidden');
  } else {
    if (dealsTableTbody) {
      dealsTableTbody.innerHTML = '';
      visibleDeals.forEach(d => dealsTableTbody.appendChild(createDealTableRow(d)));
    }
    if (dealsTableView) dealsTableView.classList.remove('hidden');
    dealsGrid.classList.add('hidden');
  }

  if (dealsLoadMoreContainer) {
    dealsLoadMoreContainer.classList.toggle('hidden', state.dealsVisibleCount >= filtered.length);
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    const root = state.currentView === 'grid' ? dealsGrid : dealsTableView;
    if (root) window.lucide.createIcons({ root });
  }
}

function renderBillingStores() {
  if (!billingGrid) return;
  const filtered = getFilteredBillingStores();
  if (matchingBillingCountEl) matchingBillingCountEl.textContent = filtered.length.toLocaleString('he-IL');

  const hasFilter = state.billingSearchQuery || state.currentBillingCity !== 'all' || state.currentBillingCategory !== 'all' || (state.billingSearchQuery && state.billingSearchInDesc);
  if (activeBillingFilterBadge) activeBillingFilterBadge.classList.toggle('hidden', !hasFilter);

  if (hasFilter && activeBillingFilterText) {
    const parts = [];
    if (state.billingSearchQuery) parts.push(`"${state.billingSearchQuery}"${state.billingSearchInDesc ? ' (כולל תיאור)' : ''}`);
    if (state.currentBillingCity !== 'all') parts.push(state.currentBillingCity === 'online' ? 'Online' : state.currentBillingCity);
    if (state.currentBillingCategory !== 'all') parts.push(state.currentBillingCategory);
    activeBillingFilterText.textContent = parts.join(' • ');
  }

  if (filtered.length === 0) {
    billingGrid.innerHTML = '';
    if (billingTableTbody) billingTableTbody.innerHTML = '';
    if (noBillingResults) noBillingResults.classList.remove('hidden');
    if (billingTableView) billingTableView.classList.add('hidden');
    if (billingLoadMoreContainer) billingLoadMoreContainer.classList.add('hidden');
    // Clear map markers dynamically when 0 matches
    if (billingMapWrapper && !billingMapWrapper.classList.contains('hidden')) {
      debouncedUpdateBillingMap([]);
    }
    return;
  }

  if (noBillingResults) noBillingResults.classList.add('hidden');

  const visibleStores = filtered.slice(0, state.billingVisibleCount);
  if (state.currentView === 'grid') {
    billingGrid.innerHTML = '';
    visibleStores.forEach(s => billingGrid.appendChild(createBillingCardElement(s)));
    billingGrid.classList.remove('hidden');
    if (billingTableView) billingTableView.classList.add('hidden');
  } else {
    if (billingTableTbody) {
      billingTableTbody.innerHTML = '';
      visibleStores.forEach(s => billingTableTbody.appendChild(createBillingTableRow(s)));
    }
    if (billingTableView) billingTableView.classList.remove('hidden');
    billingGrid.classList.add('hidden');
  }

  if (billingLoadMoreContainer) {
    billingLoadMoreContainer.classList.toggle('hidden', state.billingVisibleCount >= filtered.length);
  }

  // Update map dynamically based on active filtered results
  if (billingMapWrapper && !billingMapWrapper.classList.contains('hidden')) {
    debouncedUpdateBillingMap(filtered);
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    const root = state.currentView === 'grid' ? billingGrid : billingTableView;
    if (root) window.lucide.createIcons({ root });
  }
}

function applyViewMode(mode) {
  state.currentView = mode;
  localStorage.setItem('behatsdaa_view', mode);
  if (mode === 'grid') {
    viewGridBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400';
    viewTableBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
  } else {
    viewTableBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400';
    viewGridBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
  }
  if (state.currentTab === 'all') {
    renderAllTab();
  } else if (state.currentTab === 'stores') {
    renderStores();
  } else if (state.currentTab === 'deals') {
    renderDeals();
  } else if (state.currentTab === 'billing') {
    renderBillingStores();
  }
}

function updateCrossTabBadges() {
  const sCount = getFilteredStores().length;
  const dCount = state.dealsLoaded ? getFilteredDeals().length : 0;
  const bCount = state.billingLoaded ? getFilteredBillingStores().length : 0;

  if (tabStoresCount) tabStoresCount.textContent = sCount;
  if (tabDealsCount) tabDealsCount.textContent = dCount;
  if (tabBillingCount) tabBillingCount.textContent = bCount.toLocaleString('he-IL');
  if (tabAllCount) tabAllCount.textContent = (sCount + dCount + bCount).toLocaleString('he-IL');

  if (allQuickStoresCount) allQuickStoresCount.textContent = sCount.toLocaleString('he-IL');
  if (allQuickDealsCount) allQuickDealsCount.textContent = dCount.toLocaleString('he-IL');
  if (allQuickBillingCount) allQuickBillingCount.textContent = bCount.toLocaleString('he-IL');
}

function handleSearchChange(val, originTab) {
  const term = (val || '').trim();

  if (state.globalSearchAcrossTabs || originTab === 'all') {
    state.searchQuery = term;
    state.dealsSearchQuery = term;
    state.billingSearchQuery = term;

    if (allSearchInput && allSearchInput.value !== val) allSearchInput.value = val;
    if (searchInput && searchInput.value !== val) searchInput.value = val;
    if (dealsSearchInput && dealsSearchInput.value !== val) dealsSearchInput.value = val;
    if (billingSearchInput && billingSearchInput.value !== val) billingSearchInput.value = val;

    if (clearAllSearchBtn) clearAllSearchBtn.classList.toggle('hidden', !term);
    if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !term);
    if (clearDealsSearchBtn) clearDealsSearchBtn.classList.toggle('hidden', !term);
    if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !term);

    state.storesVisibleCount = state.STORES_PAGE_SIZE;
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;

    if (state.currentTab === 'all') renderAllTab();
    else if (state.currentTab === 'stores') renderStores();
    else if (state.currentTab === 'deals') renderDeals();
    else if (state.currentTab === 'billing') renderBillingStores();

    updateCrossTabBadges();
  } else {
    if (originTab === 'stores') {
      state.searchQuery = term;
      if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !term);
      state.storesVisibleCount = state.STORES_PAGE_SIZE;
      renderStores();
    } else if (originTab === 'deals') {
      state.dealsSearchQuery = term;
      if (clearDealsSearchBtn) clearDealsSearchBtn.classList.toggle('hidden', !term);
      state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
      renderDeals();
    } else if (originTab === 'billing') {
      state.billingSearchQuery = term;
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !term);
      state.billingVisibleCount = state.BILLING_PAGE_SIZE;
      renderBillingStores();
    }
  }
}

function handleClearSearch(originTab) {
  if (state.globalSearchAcrossTabs || originTab === 'all') {
    if (allSearchInput) allSearchInput.value = '';
    if (searchInput) searchInput.value = '';
    if (dealsSearchInput) dealsSearchInput.value = '';
    if (billingSearchInput) billingSearchInput.value = '';
    state.searchQuery = '';
    state.dealsSearchQuery = '';
    state.billingSearchQuery = '';
    if (clearAllSearchBtn) clearAllSearchBtn.classList.add('hidden');
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (clearDealsSearchBtn) clearDealsSearchBtn.classList.add('hidden');
    if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
    state.storesVisibleCount = state.STORES_PAGE_SIZE;
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;

    if (state.currentTab === 'all') renderAllTab();
    else if (state.currentTab === 'stores') renderStores();
    else if (state.currentTab === 'deals') renderDeals();
    else if (state.currentTab === 'billing') renderBillingStores();

    updateCrossTabBadges();
  } else {
    if (originTab === 'stores') {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
      state.storesVisibleCount = state.STORES_PAGE_SIZE;
      renderStores();
    } else if (originTab === 'deals') {
      if (dealsSearchInput) dealsSearchInput.value = '';
      state.dealsSearchQuery = '';
      if (clearDealsSearchBtn) clearDealsSearchBtn.classList.add('hidden');
      state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
      renderDeals();
    } else if (originTab === 'billing') {
      if (billingSearchInput) billingSearchInput.value = '';
      state.billingSearchQuery = '';
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
      state.billingVisibleCount = state.BILLING_PAGE_SIZE;
      renderBillingStores();
    }
  }
}

function getTabSearchQuery(tab) {
  if (tab === 'all') return state.searchQuery || state.dealsSearchQuery || state.billingSearchQuery || '';
  if (tab === 'stores') return state.searchQuery || '';
  if (tab === 'deals') return state.dealsSearchQuery || '';
  if (tab === 'billing') return state.billingSearchQuery || '';
  return '';
}

function setTabSearchQuery(tab, query) {
  const term = query || '';
  if (tab === 'all') {
    state.searchQuery = term;
    state.dealsSearchQuery = term;
    state.billingSearchQuery = term;
    if (allSearchInput) allSearchInput.value = term;
    if (clearAllSearchBtn) clearAllSearchBtn.classList.toggle('hidden', !term);
  } else if (tab === 'stores') {
    state.searchQuery = term;
    if (searchInput) searchInput.value = term;
    if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !term);
    state.storesVisibleCount = state.STORES_PAGE_SIZE;
  } else if (tab === 'deals') {
    state.dealsSearchQuery = term;
    if (dealsSearchInput) dealsSearchInput.value = term;
    if (clearDealsSearchBtn) clearDealsSearchBtn.classList.toggle('hidden', !term);
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  } else if (tab === 'billing') {
    if (!state.isBillingUnhidden) {
      setBillingUnhidden(true);
    }
    state.billingSearchQuery = term;
    if (billingSearchInput) billingSearchInput.value = term;
    if (clearBillingSearchBtn) clearBillingSearchBtn.classList.toggle('hidden', !term);
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
  }
}

function switchTab(tab, options = {}) {
  const previousTab = state.currentTab;
  state.currentTab = tab;

  if (!options.preserveSearch) {
    if (state.globalSearchAcrossTabs) {
      const currentQuery = getTabSearchQuery(previousTab);
      setTabSearchQuery(tab, currentQuery);
    } else if (previousTab && previousTab !== tab) {
      const currentQuery = getTabSearchQuery(previousTab);
      setTabSearchQuery(tab, currentQuery);
    }
  }

  const targetHash = tab === 'deals' ? '#deals' : (tab === 'billing' ? '#billing' : (tab === 'stores' ? '#stores' : '#all'));
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }

  const inactiveClass = 'main-tab-btn items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
  if (tabAllBtn) tabAllBtn.className = `${inactiveClass} flex`;
  tabStoresBtn.className = `${inactiveClass} flex`;
  tabDealsBtn.className = `${inactiveClass} flex`;
  if (tabBillingBtn) {
    tabBillingBtn.className = `${inactiveClass} ${state.isBillingUnhidden ? 'flex' : 'hidden'}`;
  }

  if (allTabSection) allTabSection.classList.add('hidden');
  storesTabSection.classList.add('hidden');
  dealsTabSection.classList.add('hidden');
  if (billingTabSection) billingTabSection.classList.add('hidden');

  if (viewModeToggleWrapper) {
    viewModeToggleWrapper.classList.remove('hidden');
  }

  if (tab === 'all') {
    if (tabAllBtn) {
      tabAllBtn.className = 'main-tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white';
    }
    if (allTabSection) allTabSection.classList.remove('hidden');
    renderAllTab();
  } else if (tab === 'deals') {
    tabDealsBtn.className = 'main-tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white';
    dealsTabSection.classList.remove('hidden');
    if (!state.dealsLoaded) {
      if (dealsTabSpinner) dealsTabSpinner.classList.remove('hidden');
      if (dealsGrid) dealsGrid.classList.add('hidden');
      if (noDealsResults) noDealsResults.classList.add('hidden');
      if (dealsLoadMoreContainer) dealsLoadMoreContainer.classList.add('hidden');
    } else {
      if (dealsTabSpinner) dealsTabSpinner.classList.add('hidden');
      renderDeals();
    }
  } else if (tab === 'billing') {
    if (!state.isBillingUnhidden) {
      setBillingUnhidden(true);
    }
    if (tabBillingBtn) {
      tabBillingBtn.className = 'main-tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-purple-600 text-white dark:bg-purple-600 dark:text-white';
    }
    if (billingTabSection) billingTabSection.classList.remove('hidden');
    if (!state.billingLoaded) {
      if (billingTabSpinner) billingTabSpinner.classList.remove('hidden');
      if (billingGrid) billingGrid.classList.add('hidden');
      if (noBillingResults) noBillingResults.classList.add('hidden');
      if (billingLoadMoreContainer) billingLoadMoreContainer.classList.add('hidden');
      startLoadBilling();
    } else {
      if (billingTabSpinner) billingTabSpinner.classList.add('hidden');
      renderBillingStores();
    }
  } else {
    tabStoresBtn.className = 'main-tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-blue-600 text-white dark:bg-blue-600 dark:text-white';
    storesTabSection.classList.remove('hidden');
    if (state.storesLoaded) {
      renderStores();
    }
  }
}

function onDatasetsLoaded() {
  crossLinkAllDatasets();
  updateCrossTabBadges();
  if (state.currentTab === 'all') {
    renderAllTab();
  } else if (state.currentTab === 'stores') {
    renderStores();
  } else if (state.currentTab === 'deals' && state.dealsLoaded) {
    renderDeals();
  } else if (state.currentTab === 'billing' && state.billingLoaded) {
    renderBillingStores();
  }
}

// Modal Callbacks
const storeModalCallbacks = {
  onViewDeal: (store) => {
    dealsSearchInput.value = store.name;
    state.dealsSearchQuery = store.name;
    clearDealsSearchBtn.classList.remove('hidden');
    switchTab('deals', { preserveSearch: true });
  },
  onViewBilling: (store) => {
    if (!state.isBillingUnhidden) {
      showBillingHiddenWarning(store);
      return;
    }
    billingSearchInput.value = store.name;
    state.billingSearchQuery = store.name;
    clearBillingSearchBtn.classList.remove('hidden');
    state.currentBillingCity = 'all';
    state.currentBillingCategory = 'all';
    if (billingCitySelect) billingCitySelect.value = 'all';
    switchTab('billing', { preserveSearch: true });
  }
};

const dealModalCallbacks = {
  onViewStore: (matchedStore) => {
    searchInput.value = matchedStore.name;
    state.searchQuery = matchedStore.name;
    clearSearchBtn.classList.remove('hidden');
    switchTab('stores', { preserveSearch: true });
    setTimeout(() => openStoreModal(matchedStore, storeModalElements, storeModalCallbacks), 100);
  },
  onViewBilling: (deal) => {
    if (!state.isBillingUnhidden) {
      showBillingHiddenWarning({ name: deal.supplier });
      return;
    }
    billingSearchInput.value = deal.supplier;
    state.billingSearchQuery = deal.supplier;
    clearBillingSearchBtn.classList.remove('hidden');
    state.currentBillingCity = 'all';
    state.currentBillingCategory = 'all';
    if (billingCitySelect) billingCitySelect.value = 'all';
    switchTab('billing', { preserveSearch: true });
  }
};

const billingModalCallbacks = {
  onViewStore: (linkedStore) => {
    searchInput.value = linkedStore.name;
    state.searchQuery = linkedStore.name;
    clearSearchBtn.classList.remove('hidden');
    switchTab('stores', { preserveSearch: true });
    setTimeout(() => openStoreModal(linkedStore, storeModalElements, storeModalCallbacks), 100);
  },
  onViewDeal: (dealQuery) => {
    dealsSearchInput.value = dealQuery;
    state.dealsSearchQuery = dealQuery;
    clearDealsSearchBtn.classList.remove('hidden');
    switchTab('deals', { preserveSearch: true });
  }
};

let billingLoadingPromise = null;

// Data Loading Initialization
function startLoadBilling() {
  if (state.billingLoaded) return Promise.resolve();
  if (billingLoadingPromise) return billingLoadingPromise;

  state._loadingBilling = true;
  billingLoadingPromise = loadBilling(() => {
    if (totalBillingCountEl) totalBillingCountEl.textContent = state.allBillingStores.length.toLocaleString('he-IL');
    if (tabBillingCount) tabBillingCount.textContent = state.allBillingStores.length.toLocaleString('he-IL');

    if (state.billingData.metadata?.scraped_at && billingLastUpdatedDateEl) {
      const d = new Date(state.billingData.metadata.scraped_at);
      billingLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    if (billingCitySelect) populateBillingCitiesFilter(billingCitySelect);
    if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);

    if (billingTabSpinner) billingTabSpinner.classList.add('hidden');
    if (billingGrid) billingGrid.classList.remove('hidden');

    if (state.currentTab === 'billing') {
      renderBillingStores();
    } else if (state.currentTab === 'all') {
      renderAllTab();
    }

    onDatasetsLoaded();
  }).finally(() => {
    state._loadingBilling = false;
    billingLoadingPromise = null;
  });

  return billingLoadingPromise;
}

async function loadAllData() {
  if (tabDealsCount) {
    tabDealsCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-emerald-500 rounded-full animate-spin align-middle"></span>';
  }
  if (tabBillingCount) {
    tabBillingCount.innerHTML = '<span class="inline-block w-2.5 h-2.5 border-2 border-slate-300 dark:border-slate-600 border-t-purple-500 rounded-full animate-spin align-middle"></span>';
  }

  await loadStores(() => {
    totalCountEl.textContent = state.allStores.length;
    tabStoresCount.textContent = state.allStores.length;

    if (state.storeData.metadata?.last_updated) {
      const d = new Date(state.storeData.metadata.last_updated);
      lastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    populateCardsFilter(cardFilterSelect);
    updateCategoryChips(categoryChipsContainer);
    applyViewMode(state.currentView);

    if (state.currentTab === 'stores') {
      renderStores();
    } else if (state.currentTab === 'all') {
      renderAllTab();
    }
  });

  const loadDealsPromise = loadDeals(() => {
    totalDealsCountEl.textContent = state.allDeals.length;
    tabDealsCount.textContent = state.allDeals.length;

    if (state.dealsData.metadata?.last_updated) {
      const d = new Date(state.dealsData.metadata.last_updated);
      dealsLastUpdatedDateEl.textContent = d.toLocaleDateString('he-IL');
    }

    populateDealsTagsFilter(dealsTagSelect);
    updateDealsCategoryChips(dealsCategoryChipsContainer);

    if (dealsTabSpinner) dealsTabSpinner.classList.add('hidden');
    if (dealsGrid) dealsGrid.classList.remove('hidden');

    if (state.currentTab === 'deals') {
      renderDeals();
    } else if (state.currentTab === 'all') {
      renderAllTab();
    }

    onDatasetsLoaded();
  });

  if (state.currentTab === 'billing' || state.currentTab === 'all') {
    startLoadBilling();
  } else {
    // Schedule billing load during idle time or short delay to keep initial UI thread smooth
    const scheduleBilling = window.requestIdleCallback || ((cb) => setTimeout(cb, 10));
    scheduleBilling(() => {
      startLoadBilling();
    });
  }

  // Preload wallets terms & caps info asynchronously
  fetchWalletsInfo().catch(err => {
    console.warn('Preload wallets info:', err);
  });
}

// Event Listeners
if (tabAllBtn) tabAllBtn.addEventListener('click', () => switchTab('all'));
tabStoresBtn.addEventListener('click', () => switchTab('stores'));
tabDealsBtn.addEventListener('click', () => switchTab('deals'));
if (tabBillingBtn) tabBillingBtn.addEventListener('click', () => switchTab('billing'));

window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash === '#deals') switchTab('deals');
  else if (hash === '#billing') switchTab('billing');
  else if (hash === '#stores') switchTab('stores');
  else switchTab('all');
});

// Cross-Tab Search Handlers & Debouncing
const debouncedCrossTabSearch = debounce((query, originTab) => {
  handleSearchChange(query, originTab);
}, 120);

// Tab All Event Listeners
if (allSearchInput) {
  allSearchInput.addEventListener('input', (e) => {
    debouncedCrossTabSearch(e.target.value, 'all');
  });
}

if (clearAllSearchBtn) {
  clearAllSearchBtn.addEventListener('click', () => {
    handleClearSearch('all');
  });
}

if (allSearchDescToggle) {
  allSearchDescToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    state.storesSearchInDesc = isChecked;
    state.dealsSearchInDesc = isChecked;
    state.billingSearchInDesc = isChecked;
    if (storesSearchDescToggle) storesSearchDescToggle.checked = isChecked;
    if (dealsSearchDescToggle) dealsSearchDescToggle.checked = isChecked;
    if (billingSearchDescToggle) billingSearchDescToggle.checked = isChecked;
    renderAllTab();
    updateCrossTabBadges();
  });
}

if (allResetFiltersBtn) {
  allResetFiltersBtn.addEventListener('click', () => {
    if (allSearchDescToggle) allSearchDescToggle.checked = false;
    state.storesSearchInDesc = false;
    state.dealsSearchInDesc = false;
    state.billingSearchInDesc = false;
    if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
    if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
    if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
    handleClearSearch('all');
  });
}

if (allClearFiltersBtn) {
  allClearFiltersBtn.addEventListener('click', () => {
    if (allSearchDescToggle) allSearchDescToggle.checked = false;
    state.storesSearchInDesc = false;
    state.dealsSearchInDesc = false;
    state.billingSearchInDesc = false;
    if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
    if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
    if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
    handleClearSearch('all');
  });
}

function handleJumpToTab(tab) {
  switchTab(tab, { preserveSearch: true });
  if (typeof window.scrollTo === 'function') {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
}

if (allJumpStoresBtn) {
  allJumpStoresBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('stores');
  });
}

if (allJumpDealsBtn) {
  allJumpDealsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('deals');
  });
}

if (allJumpBillingBtn) {
  allJumpBillingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('billing');
  });
}

if (allQuickStoresBtn) {
  allQuickStoresBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('stores');
  });
}

if (allQuickDealsBtn) {
  allQuickDealsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('deals');
  });
}

if (allQuickBillingBtn) {
  allQuickBillingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('billing');
  });
}

if (allWalletsGuideBtn) {
  allWalletsGuideBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openWalletsModal();
  });
}

searchInput.addEventListener('input', (e) => {
  debouncedCrossTabSearch(e.target.value, 'stores');
});

clearSearchBtn.addEventListener('click', () => {
  handleClearSearch('stores');
});

if (storesSearchDescToggle) {
  storesSearchDescToggle.addEventListener('change', (e) => {
    state.storesSearchInDesc = e.target.checked;
    if (allSearchDescToggle) allSearchDescToggle.checked = e.target.checked;
    state.storesVisibleCount = state.STORES_PAGE_SIZE;
    renderStores();
    updateCrossTabBadges();
  });
}

cardFilterSelect.addEventListener('change', (e) => {
  state.currentCard = e.target.value;
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  updateCategoryChips(categoryChipsContainer);
  renderStores();
});

sortSelect.addEventListener('change', (e) => {
  state.currentSort = e.target.value;
  state.userHasSortedStores = e.target.value !== 'default';
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  renderStores();
});

categoryChipsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.category-chip');
  if (!chip) return;
  state.currentCategory = chip.dataset.category;
  state.storesVisibleCount = state.STORES_PAGE_SIZE;
  updateCategoryChips(categoryChipsContainer);
  renderStores();
});

function resetStoresFilters() {
  state.currentCard = 'all';
  cardFilterSelect.value = 'all';
  state.currentCategory = 'all';
  if (storesSearchDescToggle) storesSearchDescToggle.checked = false;
  state.storesSearchInDesc = false;
  handleClearSearch('stores');
  updateCategoryChips(categoryChipsContainer);
}

resetFiltersBtn.addEventListener('click', resetStoresFilters);
clearFiltersBtn.addEventListener('click', resetStoresFilters);

viewGridBtn.addEventListener('click', () => applyViewMode('grid'));
viewTableBtn.addEventListener('click', () => applyViewMode('table'));
themeToggleBtn.addEventListener('click', toggleTheme);

// Store Modal
storeModalElements.modalCloseBtn.addEventListener('click', () => closeStoreModal(storeModalElements.storeModal));
storeModalElements.modalDismissBtn.addEventListener('click', () => closeStoreModal(storeModalElements.storeModal));
storeModalElements.storeModal.addEventListener('click', (e) => {
  if (e.target === storeModalElements.storeModal) closeStoreModal(storeModalElements.storeModal);
});

// Deals Search & Filters
dealsSearchInput.addEventListener('input', (e) => {
  debouncedCrossTabSearch(e.target.value, 'deals');
});

clearDealsSearchBtn.addEventListener('click', () => {
  handleClearSearch('deals');
});

if (dealsSearchDescToggle) {
  dealsSearchDescToggle.addEventListener('change', (e) => {
    state.dealsSearchInDesc = e.target.checked;
    if (allSearchDescToggle) allSearchDescToggle.checked = e.target.checked;
    state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
    renderDeals();
    updateCrossTabBadges();
  });
}

dealsTagSelect.addEventListener('change', (e) => {
  state.currentDealTag = e.target.value;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsPriceFilterSelect.addEventListener('change', (e) => {
  state.currentDealMaxPrice = e.target.value;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsSortSelect.addEventListener('change', (e) => {
  state.currentDealSort = e.target.value;
  state.userHasSortedDeals = e.target.value !== 'default';
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  renderDeals();
});

dealsCategoryChipsContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.deal-category-chip');
  if (!chip) return;
  state.currentDealCategory = chip.dataset.category;
  state.dealsVisibleCount = state.DEALS_PAGE_SIZE;
  updateDealsCategoryChips(dealsCategoryChipsContainer);
  renderDeals();
});

function resetDealsFilters() {
  state.currentDealTag = 'all';
  dealsTagSelect.value = 'all';
  state.currentDealCategory = 'all';
  state.currentDealMaxPrice = 'all';
  dealsPriceFilterSelect.value = 'all';
  if (dealsSearchDescToggle) dealsSearchDescToggle.checked = false;
  state.dealsSearchInDesc = false;
  handleClearSearch('deals');
  updateDealsCategoryChips(dealsCategoryChipsContainer);
}

resetDealsFiltersBtn.addEventListener('click', resetDealsFilters);
clearDealsFiltersBtn.addEventListener('click', resetDealsFilters);

// Deal Modal
dealModalElements.dealModalCloseBtn.addEventListener('click', () => closeDealModal(dealModalElements.dealModal));
dealModalElements.dealModalDismissBtn.addEventListener('click', () => closeDealModal(dealModalElements.dealModal));
dealModalElements.dealModal.addEventListener('click', (e) => {
  if (e.target === dealModalElements.dealModal) closeDealModal(dealModalElements.dealModal);
});

// Billing Search & Filters
if (billingSearchInput) {
  billingSearchInput.addEventListener('input', (e) => {
    debouncedCrossTabSearch(e.target.value, 'billing');
  });
}

if (clearBillingSearchBtn) {
  clearBillingSearchBtn.addEventListener('click', () => {
    handleClearSearch('billing');
  });
}

if (billingSearchDescToggle) {
  billingSearchDescToggle.addEventListener('change', (e) => {
    state.billingSearchInDesc = e.target.checked;
    if (allSearchDescToggle) allSearchDescToggle.checked = e.target.checked;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    renderBillingStores();
    updateCrossTabBadges();
  });
}

// Synchronize all "Search across all tabs" checkboxes
const searchAllTabsCheckboxes = document.querySelectorAll('.search-all-tabs-checkbox');
searchAllTabsCheckboxes.forEach(cb => {
  cb.checked = state.globalSearchAcrossTabs;
  cb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    state.globalSearchAcrossTabs = isChecked;
    localStorage.setItem('behatsdaa_global_search', isChecked);
    searchAllTabsCheckboxes.forEach(other => {
      other.checked = isChecked;
    });

    if (isChecked) {
      const activeQuery = getTabSearchQuery(state.currentTab);
      if (activeQuery) {
        handleSearchChange(activeQuery, state.currentTab);
      }
    }
  });
});

// Synchronize all "Smart Search" checkboxes
const searchSmartToggleCheckboxes = document.querySelectorAll('.search-smart-toggle-checkbox');
searchSmartToggleCheckboxes.forEach(cb => {
  cb.checked = state.smartSearchEnabled;
  cb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    state.smartSearchEnabled = isChecked;
    localStorage.setItem('behatsdaa_smart_search', isChecked);
    searchSmartToggleCheckboxes.forEach(other => {
      other.checked = isChecked;
    });
    
    // Refresh search results
    const activeQuery = getTabSearchQuery(state.currentTab);
    handleSearchChange(activeQuery || '', state.currentTab);
  });
});

if (billingCitySelect) {
  billingCitySelect.addEventListener('change', (e) => {
    state.currentBillingCity = e.target.value;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    updateBillingCategoryChips(billingCategoryChipsContainer);
    renderBillingStores();
  });
}

if (billingSortSelect) {
  billingSortSelect.addEventListener('change', (e) => {
    state.currentBillingSort = e.target.value;
    state.userHasSortedBilling = e.target.value !== 'default';
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

if (billingCategoryChipsContainer) {
  billingCategoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.billing-category-chip');
    if (!chip) return;
    state.currentBillingCategory = chip.dataset.category;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    updateBillingCategoryChips(billingCategoryChipsContainer);
    renderBillingStores();
  });
}

function resetBillingFilters() {
  state.currentBillingCity = 'all';
  if (billingCitySelect) billingCitySelect.value = 'all';
  state.currentBillingCategory = 'all';
  if (billingSearchDescToggle) billingSearchDescToggle.checked = false;
  state.billingSearchInDesc = false;
  handleClearSearch('billing');
  updateBillingCategoryChips(billingCategoryChipsContainer);
}

if (resetBillingFiltersBtn) resetBillingFiltersBtn.addEventListener('click', resetBillingFilters);
if (clearBillingFiltersBtn) clearBillingFiltersBtn.addEventListener('click', resetBillingFilters);

// Billing Modal
if (billingModalElements.billingModalCloseBtn) billingModalElements.billingModalCloseBtn.addEventListener('click', () => closeBillingModal(billingModalElements.billingModal));
if (billingModalElements.billingModalDismissBtn) billingModalElements.billingModalDismissBtn.addEventListener('click', () => closeBillingModal(billingModalElements.billingModal));
if (billingModalElements.billingModal) {
  billingModalElements.billingModal.addEventListener('click', (e) => {
    if (e.target === billingModalElements.billingModal) closeBillingModal(billingModalElements.billingModal);
  });
}

// Wallets Terms & Guide Modal
function renderWalletsModalCards(walletsInfo) {
  if (!walletsModalCardsGrid || !walletsInfo?.wallets) return;

  walletsModalCardsGrid.innerHTML = walletsInfo.wallets.map(w => {
    const storesBadge = w.stores_count ? `מכובד ב-${w.stores_count.toLocaleString('he-IL')} רשתות` : '';
    const capInfo = `תקרה חודשית: ${w.monthly_cap ? w.monthly_cap.toLocaleString('he-IL') + ' ₪' : '3,000 ₪'}`;
    const badgeColor = w.badge_class || 'bg-blue-600 text-white';

    return `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col justify-between gap-2.5">
        <div>
          <div class="flex items-center justify-between gap-1.5">
            <span class="font-bold text-slate-800 dark:text-slate-100 text-xs">${w.short_name || w.name}</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-black ${badgeColor}">${w.discount}% הנחה</span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">${w.description || w.category_scope || ''}</p>
        </div>
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>${capInfo}</span>
            ${storesBadge ? `<span class="font-medium text-slate-600 dark:text-slate-300">${storesBadge}</span>` : ''}
          </div>
          <button type="button" data-action="filter-wallet" data-card-name="${encodeURIComponent(w.name)}" class="w-full text-center text-xs py-1.5 px-2.5 rounded-lg bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold transition border border-slate-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer flex items-center justify-center gap-1 shadow-2xs">
            <span>סנן רשתות בארנק זה</span>
            <i data-lucide="arrow-left" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

async function openWalletsModal() {
  if (!walletsModal) return;
  walletsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  if (!state.walletsInfo) {
    if (walletsModalCardsGrid && walletsModalCardsGrid.children.length === 0) {
      walletsModalCardsGrid.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-slate-400">טוען נתוני כרטיסים ותקרות...</div>';
    }
    await fetchWalletsInfo();
  }

  if (state.walletsInfo && walletsModalCardsGrid) {
    renderWalletsModalCards(state.walletsInfo);
  }
}

function closeWalletsModal() {
  if (walletsModal) walletsModal.classList.add('hidden');
  document.body.style.overflow = '';
}

if (walletsGuideBtn) walletsGuideBtn.addEventListener('click', openWalletsModal);
if (storeModalWalletsInfoBtn) storeModalWalletsInfoBtn.addEventListener('click', openWalletsModal);
if (walletsModalCloseBtn) walletsModalCloseBtn.addEventListener('click', closeWalletsModal);
if (walletsModalDismissBtn) walletsModalDismissBtn.addEventListener('click', closeWalletsModal);
if (walletsModal) {
  walletsModal.addEventListener('click', (e) => {
    if (e.target === walletsModal) closeWalletsModal();
  });
}

if (walletsModalCardsGrid) {
  walletsModalCardsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="filter-wallet"]');
    if (!btn) return;
    const cardName = decodeURIComponent(btn.dataset.cardName || '');
    if (cardName) {
      if (cardFilterSelect) {
        const matchingOption = Array.from(cardFilterSelect.options).find(opt =>
          opt.value === cardName || opt.value.trim() === cardName.trim()
        );
        if (matchingOption) {
          cardFilterSelect.value = matchingOption.value;
          state.currentCard = matchingOption.value;
        } else {
          cardFilterSelect.value = cardName;
          state.currentCard = cardName;
        }
      } else {
        state.currentCard = cardName;
      }

      state.storesVisibleCount = state.STORES_PAGE_SIZE;
      updateCategoryChips(categoryChipsContainer);
      closeWalletsModal();
      if (storeModalElements?.storeModal) {
        closeStoreModal(storeModalElements.storeModal);
      }
      switchTab('stores', { preserveSearch: true });
      renderStores();
      const mainEl = document.getElementById('stores-tab-section');
      if (mainEl) {
        mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

// Progressive Load More Buttons
if (storesLoadMoreBtn) {
  storesLoadMoreBtn.addEventListener('click', () => {
    state.storesVisibleCount += state.STORES_PAGE_SIZE;
    renderStores();
  });
}

if (dealsLoadMoreBtn) {
  dealsLoadMoreBtn.addEventListener('click', () => {
    state.dealsVisibleCount += state.DEALS_PAGE_SIZE;
    renderDeals();
  });
}

if (billingLoadMoreBtn) {
  billingLoadMoreBtn.addEventListener('click', () => {
    state.billingVisibleCount += state.BILLING_PAGE_SIZE;
    renderBillingStores();
  });
}

// Google Maps Handlers
function populateBillingMapCategories() {
  if (!billingMapCategoryFilter || !state.allBillingStores || state.allBillingStores.length === 0) return;
  const currentVal = state.currentBillingCategory || 'all';

  const catCounts = {};
  state.allBillingStores.forEach(s => {
    const cat = s.category || 'כללי';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

  billingMapCategoryFilter.innerHTML = '<option value="all">כל הקטגוריות</option>';
  sortedCats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${cat} (${catCounts[cat]})`;
    billingMapCategoryFilter.appendChild(opt);
  });

  billingMapCategoryFilter.value = currentVal;
}

function updateBillingMapToolbarSummary() {
  if (!billingMapFilterSummary) return;
  const parts = [];
  if (state.currentBillingCategory !== 'all') parts.push(state.currentBillingCategory);
  if (billingMapHighDiscountToggle && billingMapHighDiscountToggle.checked) parts.push('הנחות גבוהות (≥7%)');
  if (state.billingSearchQuery) parts.push(`"${state.billingSearchQuery}"`);
  if (state.currentBillingCity !== 'all') parts.push(state.currentBillingCity === 'online' ? 'Online' : state.currentBillingCity);

  if (parts.length > 0) {
    billingMapFilterSummary.textContent = `מסונן לפי: ${parts.join(' • ')}`;
    if (billingMapClearToolbarFiltersBtn) billingMapClearToolbarFiltersBtn.classList.remove('hidden');
  } else {
    billingMapFilterSummary.textContent = '';
    if (billingMapClearToolbarFiltersBtn) billingMapClearToolbarFiltersBtn.classList.add('hidden');
  }
}

function resetAllBillingMapFilters() {
  state.billingSearchQuery = '';
  if (billingSearchInput) billingSearchInput.value = '';
  if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
  state.currentBillingCategory = 'all';
  if (billingMapCategoryFilter) billingMapCategoryFilter.value = 'all';
  if (billingMapHighDiscountToggle) billingMapHighDiscountToggle.checked = false;
  state.currentBillingCity = 'all';
  if (billingCitySelect) billingCitySelect.value = 'all';
  if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);
  renderBilling();
  updateBillingMapToolbarSummary();
}

async function openOrToggleBillingMap() {
  if (!billingMapWrapper) return;
  const isHidden = billingMapWrapper.classList.contains('hidden');

  if (isHidden) {
    billingMapWrapper.classList.remove('hidden');
    if (billingToggleMapText) billingToggleMapText.textContent = 'הסתר מפה';
    if (billingToggleMapBtn) {
      billingToggleMapBtn.classList.remove('bg-purple-50', 'hover:bg-purple-100', 'text-purple-700', 'border-purple-200/80', 'dark:bg-purple-950/60', 'dark:text-purple-300');
      billingToggleMapBtn.classList.add('bg-purple-600', 'hover:bg-purple-700', 'text-white', 'border-purple-600', 'shadow-md');
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ root: billingMapWrapper });
    }

    if (!state.billingLoaded) {
      await startLoadBilling();
    }

    populateBillingMapCategories();
    updateBillingMapToolbarSummary();

    // Smooth scroll down to map so user sees it immediately
    setTimeout(() => {
      billingMapWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    const filtered = getFilteredBillingStores();
    await updateBillingMap(filtered);
  } else {
    billingMapWrapper.classList.add('hidden');
    if (billingToggleMapText) billingToggleMapText.textContent = 'הצג מפת עסקים';
    if (billingToggleMapBtn) {
      billingToggleMapBtn.classList.add('bg-purple-50', 'hover:bg-purple-100', 'text-purple-700', 'border-purple-200/80', 'dark:bg-purple-950/60', 'dark:text-purple-300');
      billingToggleMapBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700', 'text-white', 'border-purple-600', 'shadow-md');
    }
  }
}

let updateBillingMapTimeout = null;
function debouncedUpdateBillingMap(stores, delay = 120) {
  if (updateBillingMapTimeout) clearTimeout(updateBillingMapTimeout);
  updateBillingMapTimeout = setTimeout(() => {
    updateBillingMap(stores);
  }, delay);
}

function showBillingMapError(err) {
  if (!billingMapErrorOverlay) return;
  billingMapErrorOverlay.classList.remove('hidden');
  if (billingMapEmptyOverlay) billingMapEmptyOverlay.classList.add('hidden');
  if (billingMapBoundsEmptyBanner) billingMapBoundsEmptyBanner.classList.add('hidden');

  const errStr = String(err || '');
  const isAuthOrReferrer = errStr.includes('Referer') || errStr.includes('ApiNotActivated') || errStr.includes('InvalidKey') || errStr.includes('gm_authFailure');

  if (billingMapErrorTitle) {
    billingMapErrorTitle.textContent = isAuthOrReferrer ? 'שגיאת הרשאה / מפתח ב-Google Maps' : 'שגיאה בטעינת Google Maps';
  }
  if (billingMapErrorDesc) {
    billingMapErrorDesc.textContent = isAuthOrReferrer
      ? 'מפתח ה-API של Google Maps חסום בדומיין הנוכחי (הגבלת HTTP Referrer) או שטרם הופעל Maps JavaScript API בפרויקט.'
      : (err?.message || 'לא ניתן היה להתחבר ל-Google Maps. אנא ודא שמפתח ה-API תקין ושהרשת מחוברת.');
  }
}

function scrollToBillingStore(store) {
  if (!store || !store.id) return;

  // 1. If map is currently maximized, minimize it so the user sees the store cards/table
  if (billingMapWrapper && billingMapWrapper.classList.contains('fixed')) {
    toggleMapMaximize(billingMapWrapper);
    if (billingMapMaximizeText) billingMapMaximizeText.textContent = 'הגדל מפה';
    if (billingMapMaximizeIcon) {
      billingMapMaximizeIcon.setAttribute('data-lucide', 'maximize-2');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: billingMapMaximizeBtn });
      }
    }
  }

  // 2. Ensure user is on the billing tab
  if (state.currentTab !== 'billing') {
    switchTab('billing');
  }

  // 3. Ensure the store is not hidden by an active category or search filter
  let filtered = getFilteredBillingStores();
  let storeIndex = filtered.findIndex(s => String(s.id) === String(store.id));

  let needsReRender = false;
  if (storeIndex === -1) {
    // If filtered out by search, clear search
    if (state.billingSearchQuery) {
      state.billingSearchQuery = '';
      if (billingSearchInput) billingSearchInput.value = '';
      if (clearBillingSearchBtn) clearBillingSearchBtn.classList.add('hidden');
      needsReRender = true;
    }
    // If filtered out by category, reset to 'all'
    if (state.currentBillingCategory !== 'all' && (store.category || 'כללי') !== state.currentBillingCategory) {
      state.currentBillingCategory = 'all';
      if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);
      needsReRender = true;
    }
    // If filtered out by city, match the store's city
    if (state.currentBillingCity !== 'all' && store.city && state.currentBillingCity !== store.city) {
      state.currentBillingCity = store.city;
      if (billingCitySelect) billingCitySelect.value = store.city;
      needsReRender = true;
    }

    filtered = getFilteredBillingStores();
    storeIndex = filtered.findIndex(s => String(s.id) === String(store.id));
  }

  // 4. Expand visible count to show the store if beyond current page
  if (storeIndex !== -1 && storeIndex >= state.billingVisibleCount) {
    state.billingVisibleCount = Math.min(filtered.length, storeIndex + 16);
    needsReRender = true;
  }

  if (needsReRender) {
    renderBillingStores();
  }

  // 5. Scroll smoothly to store card or table row and highlight with glow
  const attemptScroll = (retries = 3) => {
    const selector = `[data-billing-id="${store.id}"]`;
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight animation with vivid purple glow ring
      el.classList.add('ring-4', 'ring-purple-600', 'ring-offset-2', 'shadow-2xl', 'scale-[1.03]', 'transition-all', 'duration-300', 'z-20');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-purple-600', 'ring-offset-2', 'shadow-2xl', 'scale-[1.03]', 'z-20');
      }, 3000);
    } else if (retries > 0) {
      setTimeout(() => attemptScroll(retries - 1), 80);
    }
  };

  setTimeout(() => attemptScroll(3), 60);
}

async function updateBillingMap(stores) {
  if (!billingMapCanvas) return;
  if (billingMapLoading) billingMapLoading.classList.remove('hidden');
  if (billingMapErrorOverlay) billingMapErrorOverlay.classList.add('hidden');

  updateBillingMapToolbarSummary();

  try {
    if (!isMapReady()) {
      await initBillingMap(billingMapCanvas, {
        onMarkerClick: (store) => {
          scrollToBillingStore(store);
        },
        onStoreSelect: (store) => {
          openBillingModal(store, billingModalElements, billingModalCallbacks);
        },
        onBoundsChange: ({ inViewCount, totalMarkers, hasActiveMarkers }) => {
          if (billingMapBoundsEmptyBanner) {
            // Show banner if markers exist globally, but user moved map to empty area
            if (hasActiveMarkers && totalMarkers > 0 && inViewCount === 0) {
              billingMapBoundsEmptyBanner.classList.remove('hidden');
              if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons({ root: billingMapBoundsEmptyBanner });
              }
            } else {
              billingMapBoundsEmptyBanner.classList.add('hidden');
            }
          }
        },
        onError: (err) => {
          showBillingMapError(err);
        }
      });
    }

    setMapCallbacks({
      onMarkerClick: (store) => {
        scrollToBillingStore(store);
      },
      onStoreSelect: (store) => {
        openBillingModal(store, billingModalElements, billingModalCallbacks);
      }
    });

    // Apply 'Only Show High Discounts' toggle if enabled
    let storesToMap = stores || [];
    const onlyHighDiscounts = billingMapHighDiscountToggle && billingMapHighDiscountToggle.checked;
    if (onlyHighDiscounts) {
      storesToMap = storesToMap.filter(s => (s.discount || 0) >= 7);
    }

    const physicalStores = storesToMap.filter(s => {
      const c = (s.city || '').toLowerCase();
      return c && c !== 'online' && !c.includes('אונליין');
    });

    if (physicalStores.length === 0) {
      // Show user-friendly empty state overlay
      if (billingMapEmptyOverlay) {
        billingMapEmptyOverlay.classList.remove('hidden');
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons({ root: billingMapEmptyOverlay });
        }
        if (billingMapEmptyText) {
          const activeFilters = [];
          if (state.billingSearchQuery) activeFilters.push(`חיפוש "${state.billingSearchQuery}"`);
          if (state.currentBillingCategory !== 'all') activeFilters.push(`קטגוריה "${state.currentBillingCategory}"`);
          if (onlyHighDiscounts) activeFilters.push('הנחות גבוהות (≥7%)');
          if (state.currentBillingCity !== 'all') activeFilters.push(`עיר "${state.currentBillingCity}"`);

          if (activeFilters.length > 0) {
            billingMapEmptyText.textContent = `לא נמצאו בתי עסק פיזיים התואמים לסינון: ${activeFilters.join(' • ')}. באפשרותך לאפס את הסינונים או להסיר את סינון ההנחות הגבוהות.`;
          } else {
            billingMapEmptyText.textContent = 'לא נמצאו בתי עסק פיזיים להצגה במפה.';
          }
        }
      }
      if (billingMapBoundsEmptyBanner) billingMapBoundsEmptyBanner.classList.add('hidden');
      await updateMapMarkers([]);

      if (billingMapCountBadge) {
        billingMapCountBadge.textContent = '0 עסקים תואמים לסינון במפה';
      }
      return;
    }

    // Hide empty state overlay when results are present
    if (billingMapEmptyOverlay) billingMapEmptyOverlay.classList.add('hidden');

    await updateMapMarkers(storesToMap);

    if (billingMapCountBadge) {
      const displayed = Math.min(physicalStores.length, 600);
      let badgeText = `${displayed.toLocaleString('he-IL')} מתוך ${physicalStores.length.toLocaleString('he-IL')} עסקים מוצגים`;
      if (onlyHighDiscounts) {
        badgeText += ' • הנחות גבוהות (7%+)';
      }
      if (state.currentBillingCategory !== 'all') {
        badgeText += ` • ${state.currentBillingCategory}`;
      }
      if (state.billingSearchQuery) {
        badgeText += ` • "${state.billingSearchQuery}"`;
      }
      billingMapCountBadge.textContent = badgeText;
    }
  } catch (err) {
    console.warn('Map update warning:', err);
    showBillingMapError(err);
  } finally {
    if (billingMapLoading) billingMapLoading.classList.add('hidden');
  }
}

// Map Category Filter change handler
if (billingMapCategoryFilter) {
  billingMapCategoryFilter.addEventListener('change', (e) => {
    state.currentBillingCategory = e.target.value;
    state.billingVisibleCount = state.BILLING_PAGE_SIZE;
    if (billingCategoryChipsContainer) {
      billingCategoryChipsContainer.querySelectorAll('.billing-category-chip').forEach(chip => {
        const isMatch = chip.dataset.category === state.currentBillingCategory;
        chip.className = `billing-category-chip px-3.5 py-1.5 rounded-full font-medium transition text-xs flex items-center gap-1.5 whitespace-nowrap ${
          isMatch
            ? 'bg-purple-600 text-white shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
        }`;
      });
    }
    renderBilling();
    updateBillingMapToolbarSummary();
  });
}

// Map High Discount Toggle change handler
if (billingMapHighDiscountToggle) {
  billingMapHighDiscountToggle.addEventListener('change', () => {
    if (billingMapWrapper && !billingMapWrapper.classList.contains('hidden')) {
      const filtered = getFilteredBillingStores();
      updateBillingMap(filtered);
    }
  });
}

// Reset filters from empty map overlay or toolbar
if (billingMapResetFiltersBtn) {
  billingMapResetFiltersBtn.addEventListener('click', resetAllBillingMapFilters);
}
if (billingMapClearToolbarFiltersBtn) {
  billingMapClearToolbarFiltersBtn.addEventListener('click', resetAllBillingMapFilters);
}

// Recenter map on all markers
if (billingMapRecenterBtn) {
  billingMapRecenterBtn.addEventListener('click', () => {
    recenterMapToAllMarkers();
    if (billingMapBoundsEmptyBanner) billingMapBoundsEmptyBanner.classList.add('hidden');
  });
}

// Retry Google Maps loading
if (billingMapRetryBtn) {
  billingMapRetryBtn.addEventListener('click', async () => {
    if (billingMapErrorOverlay) billingMapErrorOverlay.classList.add('hidden');
    if (billingMapLoading) billingMapLoading.classList.remove('hidden');
    if (!state.billingLoaded) await startLoadBilling();
    const filtered = getFilteredBillingStores();
    await updateBillingMap(filtered);
  });
}

if (billingToggleMapBtn) {
  billingToggleMapBtn.addEventListener('click', openOrToggleBillingMap);
}

if (billingMapCloseBtn) {
  billingMapCloseBtn.addEventListener('click', () => {
    if (billingMapWrapper) billingMapWrapper.classList.add('hidden');
    if (billingToggleMapText) billingToggleMapText.textContent = 'הצג מפת עסקים';
    if (billingToggleMapBtn) {
      billingToggleMapBtn.classList.add('bg-purple-50', 'hover:bg-purple-100', 'text-purple-700', 'border-purple-200/80', 'dark:bg-purple-950/60', 'dark:text-purple-300');
      billingToggleMapBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700', 'text-white', 'border-purple-600', 'shadow-md');
    }
  });
}

if (billingMapLocateBtn) {
  billingMapLocateBtn.addEventListener('click', () => {
    centerOnUserLocation((status) => {
      if (status.loading && billingMapLocateText) {
        billingMapLocateText.textContent = 'מאתר...';
      } else if (status.success && billingMapLocateText) {
        billingMapLocateText.textContent = 'המיקום אותר!';
        setTimeout(() => { if (billingMapLocateText) billingMapLocateText.textContent = 'המיקום שלי'; }, 3000);
      } else if (status.error) {
        if (billingMapLocateText) billingMapLocateText.textContent = 'המיקום שלי';
      }
    });
  });
}

if (billingMapMaximizeBtn) {
  billingMapMaximizeBtn.addEventListener('click', () => {
    const isMax = toggleMapMaximize(billingMapWrapper);
    if (billingMapMaximizeText) {
      billingMapMaximizeText.textContent = isMax ? 'הקטן מפה' : 'הגדל מפה';
    }
    if (billingMapMaximizeIcon) {
      billingMapMaximizeIcon.setAttribute('data-lucide', isMax ? 'minimize-2' : 'maximize-2');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: billingMapMaximizeBtn });
      }
    }
  });
}

// Global Event Delegation
document.addEventListener('click', (e) => {
  // Section jump buttons & quick stats buttons delegation
  const jumpStoresBtn = e.target.closest('#all-jump-stores-btn, [data-action="jump-stores"], #all-quick-stores-btn');
  if (jumpStoresBtn) {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('stores');
    return;
  }

  const jumpDealsBtn = e.target.closest('#all-jump-deals-btn, [data-action="jump-deals"], #all-quick-deals-btn');
  if (jumpDealsBtn) {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('deals');
    return;
  }

  const jumpBillingBtn = e.target.closest('#all-jump-billing-btn, [data-action="jump-billing"], #all-quick-billing-btn');
  if (jumpBillingBtn) {
    e.preventDefault();
    e.stopPropagation();
    handleJumpToTab('billing');
    return;
  }

  // Wallets guide modal buttons delegation
  const walletsBtn = e.target.closest('#all-wallets-guide-btn, [data-action="open-wallets-guide"], #wallets-guide-btn, #store-modal-wallets-info-btn');
  if (walletsBtn) {
    e.preventDefault();
    e.stopPropagation();
    openWalletsModal();
    return;
  }
  const dealBadge = e.target.closest('[data-action="view-linked-deal"]');
  if (dealBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(dealBadge.dataset.storeName || '');
    if (storeName) {
      dealsSearchInput.value = storeName;
      state.dealsSearchQuery = storeName;
      clearDealsSearchBtn.classList.remove('hidden');
      state.currentDealTag = 'all';
      dealsTagSelect.value = 'all';
      state.currentDealCategory = 'all';
      state.currentDealMaxPrice = 'all';
      dealsPriceFilterSelect.value = 'all';
      updateDealsCategoryChips(dealsCategoryChipsContainer);
      switchTab('deals', { preserveSearch: true });
    }
    return;
  }

  const storeBadge = e.target.closest('[data-action="view-linked-store"]');
  if (storeBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(storeBadge.dataset.storeName || '');
    if (storeName) {
      searchInput.value = storeName;
      state.searchQuery = storeName;
      clearSearchBtn.classList.remove('hidden');
      state.currentCard = 'all';
      cardFilterSelect.value = 'all';
      state.currentCategory = 'all';
      updateCategoryChips(categoryChipsContainer);
      switchTab('stores', { preserveSearch: true });
    }
    return;
  }

  const billingBadge = e.target.closest('[data-action="view-linked-billing"]');
  if (billingBadge) {
    e.stopPropagation();
    const storeName = decodeURIComponent(billingBadge.dataset.storeName || '');
    if (!state.isBillingUnhidden) {
      showBillingHiddenWarning({ name: storeName });
      return;
    }
    if (storeName) {
      if (billingSearchInput) {
        billingSearchInput.value = storeName;
        state.billingSearchQuery = storeName;
        if (clearBillingSearchBtn) clearBillingSearchBtn.classList.remove('hidden');
      }
      state.currentBillingCity = 'all';
      if (billingCitySelect) billingCitySelect.value = 'all';
      state.currentBillingCategory = 'all';
      if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);
      switchTab('billing', { preserveSearch: true });
    }
    return;
  }

  const storeCard = e.target.closest('.store-card, #table-tbody tr, #all-stores-table-tbody tr');
  if (storeCard) {
    const storeId = storeCard.dataset.storeId;
    const store = state.allStores.find(s => s.id === storeId);
    if (store) openStoreModal(store, storeModalElements, storeModalCallbacks);
    return;
  }

  const dealCard = e.target.closest('.deal-card, #deals-table-tbody tr, #all-deals-table-tbody tr');
  if (dealCard) {
    const dealId = dealCard.dataset.dealId;
    const deal = state.allDeals.find(d => String(d.id) === String(dealId));
    if (deal) openDealModal(deal, dealModalElements, dealModalCallbacks);
    return;
  }

  const billingCard = e.target.closest('.billing-card, #billing-table-tbody tr, #all-billing-table-tbody tr');
  if (billingCard) {
    const billingId = billingCard.dataset.billingId;
    const billingStore = state.allBillingStores.find(b => String(b.id) === String(billingId));
    if (billingStore) openBillingModal(billingStore, billingModalElements, billingModalCallbacks);
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeStoreModal(storeModalElements.storeModal);
    closeDealModal(dealModalElements.dealModal);
    closeBillingModal(billingModalElements.billingModal);
    closeWalletsModal();
  }
});

// Initialize
initTheme();
if (window.lucide && typeof window.lucide.createIcons === 'function') {
  window.lucide.createIcons();
}
setBillingUnhidden(state.isBillingUnhidden);
switchTab(state.currentTab);
loadAllData();

// Unhide / Hide Billing Event Listeners
if (unhideBillingToggleBtn) {
  unhideBillingToggleBtn.addEventListener('click', () => {
    setBillingUnhidden(!state.isBillingUnhidden);
  });
}
if (allUnhideBillingBtn) {
  allUnhideBillingBtn.addEventListener('click', () => {
    setBillingUnhidden(true);
    switchTab('billing');
  });
}
if (billingWarningCloseBtn) billingWarningCloseBtn.addEventListener('click', closeBillingHiddenWarning);
if (billingWarningDismissBtn) billingWarningDismissBtn.addEventListener('click', closeBillingHiddenWarning);
if (billingHiddenWarningModal) {
  billingHiddenWarningModal.addEventListener('click', (e) => {
    if (e.target === billingHiddenWarningModal) closeBillingHiddenWarning();
  });
}
if (billingWarningUnhideBtn) {
  billingWarningUnhideBtn.addEventListener('click', () => {
    closeBillingHiddenWarning();
    setBillingUnhidden(true);
    const targetStore = pendingWarningStore;
    pendingWarningStore = null;
    if (targetStore && targetStore.name) {
      if (billingSearchInput) {
        billingSearchInput.value = targetStore.name;
        state.billingSearchQuery = targetStore.name;
        if (clearBillingSearchBtn) clearBillingSearchBtn.classList.remove('hidden');
      }
      state.currentBillingCity = 'all';
      if (billingCitySelect) billingCitySelect.value = 'all';
      state.currentBillingCategory = 'all';
      if (billingCategoryChipsContainer) updateBillingCategoryChips(billingCategoryChipsContainer);
      switchTab('billing', { preserveSearch: true });
    } else {
      switchTab('billing');
    }
  });
}
