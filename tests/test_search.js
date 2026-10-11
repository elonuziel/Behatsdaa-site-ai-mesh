import assert from 'node:assert';
import {
  initStoresSearch,
  searchStores,
  suggestStores,
  initDealsSearch,
  searchDeals,
  suggestDeals,
  initBillingSearch,
  searchBilling,
  suggestBilling
} from '../src/utils/search.ts';

console.log('🧪 Running Search Unit Tests...');

// 1. Test Stores Search
const mockStores = [
  { id: 101, name: 'שופרסל שלי', category: 'מזון ורשתות', slug: 'shufersal' },
  { id: 102, name: 'סופר פארם', category: 'פארם ובריאות', slug: 'super-pharm' }
];

const storesSearchInstance = initStoresSearch(mockStores);
assert.ok(storesSearchInstance, 'initStoresSearch should return MiniSearch instance');

const storeResults = searchStores('שופרסל');
assert.ok(storeResults instanceof Map, 'searchStores should return a Map');
assert.ok(storeResults.has(101) || storeResults.has('101'), 'searchStores should find store 101');

const storeSuggestions = suggestStores('שופ');
assert.ok(Array.isArray(storeSuggestions), 'suggestStores should return an array');

// 2. Test Deals Search
const mockDeals = [
  { id: '201', title: '50% הנחה בקולנוע', supplier: 'סינמה סיטי', category: 'פנאי', slug: 'cinema-city-50' }
];

const dealsSearchInstance = initDealsSearch(mockDeals);
assert.ok(dealsSearchInstance, 'initDealsSearch should return MiniSearch instance');

const dealResults = searchDeals('קולנוע');
assert.ok(dealResults instanceof Map, 'searchDeals should return a Map');
assert.ok(dealResults.has('201'), 'searchDeals should find deal 201');

const dealSuggestions = suggestDeals('קול');
assert.ok(Array.isArray(dealSuggestions), 'suggestDeals should return an array');

// 3. Test Billing Search
const mockBilling = [
  { id: '301', name: 'קפה לנדוור', city: 'תל אביב', category: 'מסעדות', slug: 'landwer-ta' }
];

const billingSearchInstance = initBillingSearch(mockBilling);
assert.ok(billingSearchInstance, 'initBillingSearch should return MiniSearch instance');

const billingResults = searchBilling('לנדוור');
assert.ok(billingResults instanceof Map, 'searchBilling should return a Map');
assert.ok(billingResults.has('301'), 'searchBilling should find billing 301');

const billingSuggestions = suggestBilling('לנד');
assert.ok(Array.isArray(billingSuggestions), 'suggestBilling should return an array');

console.log('🎉 All Search Unit Tests Passed Successfully!');
