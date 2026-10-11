function normalizeHebrew(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[״"]/g, '')
    .replace(/['׳]/g, '')
    .replace(/[-\s_]+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface CrosslinkState {
  allStores: any[];
  allDeals: any[];
  allBillingStores: any[];
}

export const crosslinkState: CrosslinkState = {
  allStores: [],
  allDeals: [],
  allBillingStores: []
};

const storeLookupById = new Map<string, any>();
const storeLookupByNormalizedName = new Map<string, any>();
const storeLookupByCore = new Map<string, any>();

export function getCoreBrand(name: string): string {
  if (!name) return '';
  let s = (name || '').toLowerCase();
  s = s.replace(/\b(אונליין|online|רשת|אתר|סניף|סניפי|בע"מ|בעמ|בע'מ|ltd|ישראל|israel|shop|store)\b/gi, ' ');
  s = s.replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');
  return (s || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');
}

export function rebuildStoreLookupMaps(stores: any[] = crosslinkState.allStores) {
  storeLookupById.clear();
  storeLookupByNormalizedName.clear();
  storeLookupByCore.clear();

  stores.forEach(store => {
    if (!store) return;
    if (store.id != null) {
      storeLookupById.set(String(store.id), store);
    }

    const normalizedName = normalizeHebrew(store.name || '');
    if (normalizedName) {
      storeLookupByNormalizedName.set(normalizedName, store);
    }

    const core = store._coreBrand || getCoreBrand(store.name);
    if (core) {
      storeLookupByCore.set(core, store);
    }
  });
}

export function resolveDealStore(deal: any) {
  if (!deal) return null;
  if (deal.linkedStore) return deal.linkedStore;

  const matchedStoreId = deal.matched_store_id != null ? String(deal.matched_store_id) : null;
  if (matchedStoreId && storeLookupById.has(matchedStoreId)) {
    return storeLookupById.get(matchedStoreId);
  }

  if (deal.matched_store_name) {
    const normalizedMatchedName = normalizeHebrew(deal.matched_store_name);
    if (normalizedMatchedName && storeLookupByNormalizedName.has(normalizedMatchedName)) {
      return storeLookupByNormalizedName.get(normalizedMatchedName);
    }
  }

  const supplier = deal.supplier || '';
  if (supplier) {
    const supplierCore = getCoreBrand(supplier);
    if (supplierCore && storeLookupByCore.has(supplierCore)) {
      return storeLookupByCore.get(supplierCore);
    }
  }

  return null;
}

export function crossLinkAllDatasets(stateObj: CrosslinkState = crosslinkState) {
  if (!stateObj.allStores || !stateObj.allStores.length) return;
  rebuildStoreLookupMaps(stateObj.allStores);

  const billingByCore = new Map<string, any[]>();
  (stateObj.allBillingStores || []).forEach(b => {
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

  const dealsByCore = new Map<string, any[]>();
  (stateObj.allDeals || []).forEach(d => {
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
      list.push(d);
    }
  });

  stateObj.allStores.forEach(s => {
    const core = s._coreBrand || getCoreBrand(s.name);
    s._coreBrand = core;

    if (core && dealsByCore.has(core)) {
      s.linked_deals = dealsByCore.get(core);
    }
    if (core && billingByCore.has(core)) {
      const matches = billingByCore.get(core)!;
      let best = matches[0];
      for (let i = 1; i < matches.length; i++) {
        if (matches[i].discount > best.discount) best = matches[i];
      }
      s.linked_billing = best;
    }
  });
}
