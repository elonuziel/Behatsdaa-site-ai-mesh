/**
 * Application State Container
 */

export const state = {
  // Navigation & Strict Mobile DOM Limits (30 items at a time to prevent memory spikes)
  currentTab: 'all',
  globalSearchAcrossTabs: localStorage.getItem('behatsdaa_global_search') !== 'false',
  smartSearchEnabled: localStorage.getItem('behatsdaa_smart_search') === 'true',
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
  currentSort: 'default',
  userHasSortedStores: false,
  currentView: localStorage.getItem('behatsdaa_view') || 'grid',

  // Deals & Vouchers
  dealsData: null,
  allDeals: [],
  availableTags: [],
  currentDealTag: 'all',
  currentDealCategory: 'all',
  dealsSearchQuery: '',
  dealsSearchInDesc: false,
  currentDealSort: 'default',
  userHasSortedDeals: false,
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
  currentBillingSort: 'default',
  userHasSortedBilling: false,

  // Active Modals & Loading Flags
  activeModalStore: null,
  activeModalBillingStore: null,
  walletsInfo: null,
  storesLoaded: false,
  dealsLoaded: false,
  billingLoaded: false,

  // Billing Tab Visibility (Hidden by default for max performance)
  isBillingUnhidden: (typeof localStorage !== 'undefined' && localStorage.getItem('behatsdaa_billing_unhidden') === 'true') || false,
};

if (window.location.hash === '#deals') state.currentTab = 'deals';
else if (window.location.hash === '#billing') state.currentTab = 'all';
else if (window.location.hash === '#stores') state.currentTab = 'stores';
else if (window.location.hash === '#all') state.currentTab = 'all';
else state.currentTab = 'all';
