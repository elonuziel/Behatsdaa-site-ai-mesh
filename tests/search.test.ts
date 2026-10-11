import { describe, it, expect } from 'vitest';
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
} from '../src/utils/search';

describe('Search Utility', () => {
  it('searches and suggests stores correctly', () => {
    const mockStores = [
      { id: 101, name: 'שופרסל שלי', category: 'מזון ורשתות', slug: 'shufersal' },
      { id: 102, name: 'סופר פארם', category: 'פארם ובריאות', slug: 'super-pharm' }
    ];

    const storesSearchInstance = initStoresSearch(mockStores as any);
    expect(storesSearchInstance).toBeTruthy();

    const storeResults = searchStores('שופרסל');
    expect(storeResults instanceof Map).toBe(true);
    expect(storeResults.has(101) || storeResults.has('101' as any)).toBe(true);

    const storeSuggestions = suggestStores('שופ');
    expect(Array.isArray(storeSuggestions)).toBe(true);
  });

  it('searches and suggests deals correctly', () => {
    const mockDeals = [
      { id: '201', title: '50% הנחה בקולנוע', supplier: 'סינמה סיטי', category: 'פנאי', slug: 'cinema-city-50' }
    ];

    const dealsSearchInstance = initDealsSearch(mockDeals as any);
    expect(dealsSearchInstance).toBeTruthy();

    const dealResults = searchDeals('קולנוע');
    expect(dealResults instanceof Map).toBe(true);
    expect(dealResults.has('201')).toBe(true);

    const dealSuggestions = suggestDeals('קול');
    expect(Array.isArray(dealSuggestions)).toBe(true);
  });

  it('searches and suggests billing stores correctly', () => {
    const mockBilling = [
      { id: '301', name: 'קפה לנדוור', city: 'תל אביב', category: 'מסעדות', slug: 'landwer-ta' }
    ];

    const billingSearchInstance = initBillingSearch(mockBilling as any);
    expect(billingSearchInstance).toBeTruthy();

    const billingResults = searchBilling('לנדוור');
    expect(billingResults instanceof Map).toBe(true);
    expect(billingResults.has('301')).toBe(true);

    const billingSuggestions = suggestBilling('לנד');
    expect(Array.isArray(billingSuggestions)).toBe(true);
  });
});
