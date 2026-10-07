/**
 * Data Loading & Cross-Linking Module
 */

import { state } from './state.js';
import { normalizeHebrew } from './utils.js';
import { initStoresSearch, initDealsSearch, initBillingSearch } from './search.js';

// In-Memory LRU Caches for on-demand dynamic details
const storeDetailCache = new Map();
const dealDetailCache = new Map();

/**
 * On-demand dynamic fetcher for dedicated [slug].json store files
 */
export async function fetchStoreDetail(slugOrId) {
  if (!slugOrId) return null;
  const key = String(slugOrId);
  if (storeDetailCache.has(key)) {
    return storeDetailCache.get(key);
  }

  // Find store in state to identify slug
  const storeObj = state.allStores.find(s => s.id === slugOrId || s.slug === slugOrId);
  const slug = storeObj?.slug || slugOrId;

  try {
    const res = await fetch(`data/stores/${encodeURIComponent(slug)}.json`);
    if (res.ok) {
      const data = await res.json();
      storeDetailCache.set(key, data);
      storeDetailCache.set(String(data.id), data);
      storeDetailCache.set(String(data.slug), data);
      return data;
    }
  } catch (err) {
    console.warn(`Dynamic fetch failed for store ${slug}, fallback to memory:`, err);
  }

  // Fallback to in-memory store object if individual file fetch failed
  if (storeObj) {
    storeDetailCache.set(key, storeObj);
    return storeObj;
  }
  return null;
}

/**
 * On-demand dynamic fetcher for dedicated [id].json deal files
 */
export async function fetchDealDetail(id) {
  if (!id) return null;
  const key = String(id);
  if (dealDetailCache.has(key)) {
    return dealDetailCache.get(key);
  }

  try {
    const res = await fetch(`data/deals/${encodeURIComponent(key)}.json`);
    if (res.ok) {
      const data = await res.json();
      dealDetailCache.set(key, data);
      return data;
    }
  } catch (err) {
    console.warn(`Dynamic fetch failed for deal ${id}, fallback to memory:`, err);
  }

  const dealObj = state.allDeals.find(d => String(d.id) === key);
  if (dealObj) {
    dealDetailCache.set(key, dealObj);
    return dealObj;
  }
  return null;
}

/**
 * Lightweight initial search index loader (< 400KB)
 */
export async function loadSearchIndex() {
  try {
    const res = await fetch('data/search-index.json');
    if (!res.ok) throw new Error('Failed to load search-index.json');
    state.searchIndexData = await res.json();
    return state.searchIndexData;
  } catch (err) {
    console.warn('search-index fallback:', err);
    return null;
  }
}

export function getCoreBrand(name) {
  if (!name) return '';
  let s = (name || '').toLowerCase();
  s = s.replace(/\b(אונליין|online|רשת|אתר|סניף|סניפי|בע"מ|בעמ|בע'מ|ltd|ישראל|israel|shop|store)\b/gi, ' ');
  s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
  return (s || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');
}

let crossLinkedWithDeals = false;
let crossLinkedWithBilling = false;

export function crossLinkAllDatasets() {
  if (!state.allStores.length) return;
  const hasDeals = state.allDeals && state.allDeals.length > 0;
  const hasBilling = state.allBillingStores && state.allBillingStores.length > 0;

  // If already linked with whatever datasets are currently loaded, skip
  if ((!hasDeals || crossLinkedWithDeals) && (!hasBilling || crossLinkedWithBilling)) {
    return;
  }

  const cleanKey = (str) => (str || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');

  // 1. Map: core brand -> array of billing stores
  const billingByCore = new Map();
  state.allBillingStores.forEach(b => {
    const core = b._coreBrand || getCoreBrand(b.name);
    b._coreBrand = core;
    if (!core) return;
    let list = billingByCore.get(core);
    if (!list) {
      list = [];
      billingByCore.set(core, list);
    }
    list.push(b);
  });

  function findBestBillingMatch(name) {
    if (!name) return null;
    const core = getCoreBrand(name);
    if (!core) return null;
    const matches = billingByCore.get(core);
    if (matches && matches.length > 0) {
      let best = matches[0];
      for (let i = 1; i < matches.length; i++) {
        if (matches[i].discount > best.discount) best = matches[i];
      }
      return best;
    }
    return null;
  }

  // 2. Map: core brand -> store (Tab 1)
  const storeByCore = new Map();
  const storeByNormalizedName = new Map();
  state.allStores.forEach(s => {
    const core = s._coreBrand || getCoreBrand(s.name);
    s._coreBrand = core;
    if (core && !storeByCore.has(core)) storeByCore.set(core, s);
    if (s._nameNorm) storeByNormalizedName.set(s._nameNorm, s);
  });

  // 3. Map: core brand -> deals (Tab 2)
  const dealsByCore = new Map();
  state.allDeals.forEach(d => {
    const k1 = d._suppCore || getCoreBrand(d.supplier);
    d._suppCore = k1;
    const k2 = d.matched_store_name ? getCoreBrand(d.matched_store_name) : null;

    if (k1) {
      let list = dealsByCore.get(k1);
      if (!list) { list = []; dealsByCore.set(k1, list); }
      list.push(d);
    }
    if (k2 && k2 !== k1) {
      let list = dealsByCore.get(k2);
      if (!list) { list = []; dealsByCore.set(k2, list); }
      if (!list.includes(d)) list.push(d);
    }
  });

  function findCompatibleStore(b) {
    if (!b || !b.name) return null;
    const bCore = b._coreBrand;
    if (bCore && storeByCore.has(bCore)) return storeByCore.get(bCore);

    if (b.name.includes(' - ') || b.name.includes(' – ')) {
      const parts = b.name.split(/[–\-]/);
      const leftCore = getCoreBrand(parts[0]);
      if (leftCore && storeByCore.has(leftCore)) {
        return storeByCore.get(leftCore);
      }
    }

    const bName = b.name.trim().toLowerCase();
    const bCityClean = cleanKey(b.city);
    for (const [score, s] of storeByCore.entries()) {
      if (score.length < 3) continue;
      const sName = s.name.trim().toLowerCase();
      if (bName.startsWith(sName)) {
        const rest = bName.slice(sName.length).trim().replace(/^[ \-_–/\\|,.]+/, '').trim();
        const restCore = cleanKey(rest);
        const isBranchWord = /^(סניף|סניפי|קניון|מרכז|מתחם)/.test(rest);
        const isCityMatch = Boolean(bCityClean && bCityClean !== 'online' && (restCore === bCityClean || restCore.startsWith(bCityClean)));
        const isBracketed = /^(\[|\().+(\]|\))$/.test(bName.slice(sName.length).trim());
        if (isBranchWord || isCityMatch || isBracketed) {
          return s;
        }
      }
    }

    return null;
  }

  // Cross-link Billing Stores (Tab 3)
  const storeToBillingMatches = new Map();
  state.allBillingStores.forEach(b => {
    const bCore = b._coreBrand;
    b.linkedStore = findCompatibleStore(b);

    if (b.linkedStore) {
      let list = storeToBillingMatches.get(b.linkedStore.id);
      if (!list) {
        list = [];
        storeToBillingMatches.set(b.linkedStore.id, list);
      }
      list.push(b);
    }

    const deals = [];
    const d1 = dealsByCore.get(bCore);
    if (d1) {
      for (let i = 0; i < d1.length; i++) deals.push(d1[i]);
    }
    if (b.linkedStore && b.linkedStore.linkedDeals) {
      for (let i = 0; i < b.linkedStore.linkedDeals.length; i++) {
        const d = b.linkedStore.linkedDeals[i];
        if (!deals.includes(d)) deals.push(d);
      }
    }
    b.linkedDeals = deals;
  });

  // Cross-link Stores (Tab 1)
  state.allStores.forEach(store => {
    const sCore = store._coreBrand;
    const storeDeals = dealsByCore.get(sCore) || [];
    const extraDeals = [];

    state.allDeals.forEach(d => {
      if ((d.matched_store_id && d.matched_store_id === store.id) ||
          (d.matched_store_name && d.matched_store_name === store.name)) {
        if (!storeDeals.includes(d) && !extraDeals.includes(d)) {
          extraDeals.push(d);
        }
      }
    });

    store.linkedDeals = storeDeals.concat(extraDeals);

    let bestBilling = findBestBillingMatch(store.name);
    const branchBillings = storeToBillingMatches.get(store.id);
    if (branchBillings && branchBillings.length > 0) {
      let bestBranch = branchBillings[0];
      for (let i = 1; i < branchBillings.length; i++) {
        if (branchBillings[i].discount > bestBranch.discount) bestBranch = branchBillings[i];
      }
      if (!bestBilling || bestBranch.discount > bestBilling.discount) {
        bestBilling = bestBranch;
      }
    }
    store.linkedBillingStore = bestBilling;

    if (branchBillings && branchBillings.length > 0 && store.linkedDeals.length > 0) {
      branchBillings.forEach(b => {
        store.linkedDeals.forEach(d => {
          if (!b.linkedDeals.includes(d)) b.linkedDeals.push(d);
        });
      });
    }
  });

  // Cross-link Deals (Tab 2)
  state.allDeals.forEach(deal => {
    const suppCore = deal._suppCore;
    let matchedStore = null;
    if (deal.matched_store_id) {
      matchedStore = state.allStores.find(s => s.id === deal.matched_store_id) || null;
    }
    if (!matchedStore && deal.matched_store_name) {
      matchedStore = storeByNormalizedName.get(normalizeHebrew(deal.matched_store_name)) || null;
    }
    if (!matchedStore && suppCore) {
      matchedStore = storeByCore.get(suppCore) || null;
    }
    deal.linkedStore = matchedStore;

    let bestBilling = findBestBillingMatch(deal.supplier);
    if (!bestBilling && deal.linkedStore && deal.linkedStore.linkedBillingStore) {
      bestBilling = deal.linkedStore.linkedBillingStore;
    }
    deal.linkedBillingStore = bestBilling;
  });

  if (hasDeals) crossLinkedWithDeals = true;
  if (hasBilling) crossLinkedWithBilling = true;
}

export async function loadStores(onStoresLoaded) {
  try {
    const response = await fetch('data/stores.json');
    if (!response.ok) throw new Error('Failed to load stores.json');
    state.storeData = await response.json();
  } catch (err) {
    console.warn('Stores fallback:', err);
    state.storeData = { metadata: { total_stores: 0, available_cards: [] }, stores: [] };
  }

  state.allStores = state.storeData.stores || [];
  state.allStores.forEach(s => {
    s._nameNorm = normalizeHebrew(s.name || '');
    s._catNorm = normalizeHebrew(s.category || '');
    s._condNorm = normalizeHebrew(s.conditions || '');
    s._cardsNorm = (s.cards || []).map(c => `${normalizeHebrew(c.card_name)} ${normalizeHebrew(c.discount)} ${normalizeHebrew(c.notes || '')}`).join(' ');
    s._searchStr = `${s._nameNorm} ${s._catNorm} ${s._cardsNorm}`.trim();
    s._searchWithDescStr = `${s._searchStr} ${s._condNorm}`.trim();
  });
  state.availableCards = state.storeData.metadata?.available_cards || [];
  state.storesLoaded = true;

  // Initialize high-performance MiniSearch for stores
  try {
    initStoresSearch(state.allStores);
  } catch (err) {
    console.warn('MiniSearch stores init:', err);
  }

  if (onStoresLoaded) onStoresLoaded();
}

export async function loadDeals(onDealsLoaded) {
  try {
    const dResponse = await fetch('data/deals.json');
    if (!dResponse.ok) throw new Error('Failed to load deals.json');
    state.dealsData = await dResponse.json();
  } catch (err) {
    console.warn('Deals fallback:', err);
    state.dealsData = { metadata: { total_deals: 0, tags: [], categories: [] }, deals: [] };
  }

  state.allDeals = state.dealsData.deals || [];
  state.allDeals.forEach(d => {
    d._titleNorm = normalizeHebrew(d.title || '');
    d._suppNorm = normalizeHebrew(d.supplier || '');
    d._catNorm = normalizeHebrew(d.category || '');
    d._tagsNorm = normalizeHebrew((d.tags || []).join(' '));
    d._descNorm = normalizeHebrew(d.description || '');
    d._termsNorm = normalizeHebrew(d.terms_of_use || '');
    d._searchStr = `${d._titleNorm} ${d._suppNorm} ${d._catNorm} ${d._tagsNorm}`.trim();
    d._searchWithDescStr = `${d._searchStr} ${d._descNorm} ${d._termsNorm}`.trim();
  });
  state.availableTags = state.dealsData.metadata?.tags || [];
  state.dealsLoaded = true;

  // Initialize high-performance MiniSearch for deals
  try {
    initDealsSearch(state.allDeals);
  } catch (err) {
    console.warn('MiniSearch deals init:', err);
  }

  if (onDealsLoaded) onDealsLoaded();
}

export async function loadBilling(onBillingLoaded) {
  try {
    const bResponse = await fetch('data/billing_stores.json');
    if (!bResponse.ok) throw new Error('Failed to load billing_stores.json');
    state.billingData = await bResponse.json();
  } catch (err) {
    console.warn('Billing fallback:', err);
    state.billingData = { metadata: { total_stores: 0 }, stores: [] };
  }

  state.allBillingStores = state.billingData.stores || [];
  state.allBillingStores.forEach(s => {
    s._nameNorm = normalizeHebrew(s.name || '');
    s._cityNorm = normalizeHebrew(s.city || '');
    s._catNorm = normalizeHebrew(`${s.category || ''} ${s.subcategory || ''}`);
    s._addressNorm = normalizeHebrew(s.address || '');
    s._descNorm = normalizeHebrew(s.description || '');
    s._searchStr = `${s._nameNorm} ${s._cityNorm} ${s._catNorm} ${s._addressNorm}`.trim();
    s._searchWithDescStr = `${s._searchStr} ${s._descNorm}`.trim();
  });
  state.billingLoaded = true;

  // Initialize high-performance MiniSearch for billing
  try {
    initBillingSearch(state.allBillingStores);
  } catch (err) {
    console.warn('MiniSearch billing init:', err);
  }

  if (onBillingLoaded) onBillingLoaded();
}
