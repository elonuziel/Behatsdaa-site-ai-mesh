/**
 * Application State Container
 */

export const state = {
  // Navigation & Strict Mobile DOM Limits (30 items at a time to prevent memory spikes)
  currentTab: 'stores',
  globalSearchAcrossTabs: localStorage.getItem('behatsdaa_global_search') !== 'false',
  STORES_PAGE_SIZE: 30,
  storesVisibleCount: 30,
  DEALS_PAGE_SIZE: 30,
  dealsVisibleCount: 30,
  BILLING_PAGE_SIZE: 30,
  billingVisibleCount: 30,
  searchIndexData: null,

  // Stores (Rechargeable Cards)
  storeData: null,
  allStores: [],
  availableCards: [],
  currentCard: 'all',
  currentCategory: 'all',
  searchQuery: '',
  storesSearchInDesc: false,
  currentSort: 'discount-desc',
  currentView: localStorage.getItem('behatsdaa_view') || 'grid',

  // Deals & Vouchers
  dealsData: null,
  allDeals: [],
  availableTags: [],
  currentDealTag: 'all',
  currentDealCategory: 'all',
  dealsSearchQuery: '',
  dealsSearchInDesc: false,
  currentDealSort: 'discount-desc',
  currentDealMaxPrice: 'all',

  // Billing Discounts
  billingData: null,
  allBillingStores: [],
  availableBillingCities: [],
  availableBillingCategories: [],
  currentBillingCity: 'all',
  currentBillingCategory: 'all',
  billingSearchQuery: '',
  billingSearchInDesc: false,
  currentBillingSort: 'discount-desc',

  // Active Modals & Loading Flags
  activeModalStore: null,
  activeModalBillingStore: null,
  storesLoaded: false,
  dealsLoaded: false,
  billingLoaded: false,
};

if (window.location.hash === '#deals') state.currentTab = 'deals';
else if (window.location.hash === '#billing') state.currentTab = 'billing';
