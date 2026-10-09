/**
 * Automated Test Suite for the Behatsdaa Favorites Module (js/favorites.js)
 *
 * Runs in plain Node.js (ES modules only) with a lightweight in-memory
 * localStorage mock, a recording window mock and no external dependencies.
 *
 *   node tests/test_favorites.js
 *
 * Coverage:
 *  - Initial empty state & schema shape
 *  - Add / remove / toggle across stores, deals and billing
 *  - Count calculations (per-type, total, aliases, invalid types)
 *  - JSON export / import with schema validation and sanitization
 *  - Reactive 'behatsdaa:favorites-updated' event emission
 *  - Corrupted, legacy, blocked and unavailable localStorage handling
 */

import assert from 'assert';

const STORAGE_KEY = 'behatsdaa_user_favorites';
const EVENT_NAME = 'behatsdaa:favorites-updated';

/* ------------------------------------------------------------------ *
 * Lightweight in-memory localStorage mock
 * ------------------------------------------------------------------ */

class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  get length() {
    return this._data.size;
  }
  key(index) {
    return index >= 0 && index < this._data.size ? Array.from(this._data.keys())[index] : null;
  }
  getItem(key) {
    return this._data.has(String(key)) ? this._data.get(String(key)) : null;
  }
  setItem(key, value) {
    this._data.set(String(key), String(value));
  }
  removeItem(key) {
    this._data.delete(String(key));
  }
  clear() {
    this._data.clear();
  }
}

/** Simulates a fully blocked storage (private mode / SecurityError / quota). */
class ThrowingStorage {
  getItem() { throw new Error('Storage is blocked'); }
  setItem() { throw new Error('Storage is blocked'); }
  removeItem() { throw new Error('Storage is blocked'); }
  clear() { throw new Error('Storage is blocked'); }
  get length() { throw new Error('Storage is blocked'); }
  key() { throw new Error('Storage is blocked'); }
}

/* ------------------------------------------------------------------ *
 * Browser environment mocks (installed before the module is imported)
 * ------------------------------------------------------------------ */

const dispatchedEvents = [];

globalThis.localStorage = new MemoryStorage();

const windowMock = {
  dispatchEvent(event) {
    dispatchedEvents.push(event);
    return true;
  },
};
globalThis.window = windowMock;

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}

const favorites = await import('../js/favorites.js');

/* ------------------------------------------------------------------ *
 * Tiny zero-dependency test harness
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function section(title) {
  console.log(`\n${title}`);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (error) {
    failed++;
    process.exitCode = 1;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ↳ ${error && error.message ? error.message : error}`);
  }
}

/**
 * Resets the persisted storage AND the module's in-memory fallback so every
 * test starts from a clean slate regardless of how previous tests ended.
 */
function resetState() {
  globalThis.localStorage = new ThrowingStorage();
  favorites.clearAllFavorites(); // clears the in-memory fallback
  globalThis.localStorage = new MemoryStorage();
  favorites.clearAllFavorites(); // clears persisted storage
  globalThis.localStorage.clear();
  dispatchedEvents.length = 0;
}

function readStoredJson() {
  return JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
}

console.log('====================================================');
console.log('   Behatsdaa Favorites Module — Automated Tests      ');
console.log('====================================================');

/* ------------------------------------------------------------------ *
 * 1. Initial empty state
 * ------------------------------------------------------------------ */

section('1. Initial empty state');

resetState();

test('getFavorites() returns the canonical empty schema', () => {
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, []);
  assert.deepStrictEqual(current.deals, []);
  assert.deepStrictEqual(current.billing, []);
  assert.deepStrictEqual(Object.keys(current).sort(), ['billing', 'deals', 'stores', 'updatedAt']);
  assert.strictEqual(typeof current.updatedAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(current.updatedAt)), 'updatedAt must be a valid date string');
});

test('counts are zero before anything is bookmarked', () => {
  assert.strictEqual(favorites.getFavoritesCount(), 0);
  assert.strictEqual(favorites.getFavoritesCount('store'), 0);
  assert.strictEqual(favorites.getFavoritesCount('deal'), 0);
  assert.strictEqual(favorites.getFavoritesCount('billing'), 0);
});

test('isFavorite() is false for every type on an empty state', () => {
  assert.strictEqual(favorites.isFavorite('store', 'איתי-ברנדס-אונליין'), false);
  assert.strictEqual(favorites.isFavorite('deal', '185816'), false);
  assert.strictEqual(favorites.isFavorite('billing', 'billing-42'), false);
});

test('read-only calls never create the localStorage key', () => {
  favorites.getFavorites();
  favorites.getFavoritesCount();
  favorites.isFavorite('store', 'nobody');
  assert.strictEqual(globalThis.localStorage.getItem(STORAGE_KEY), null);
});

/* ------------------------------------------------------------------ *
 * 2. Stores — add, remove, persist
 * ------------------------------------------------------------------ */

section('2. Stores — add, remove, persist');

test('toggleFavorite() adds a store and persists the full schema', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', 'עגליס-אונליין'), true);
  assert.strictEqual(favorites.isFavorite('store', 'עגליס-אונליין'), true);
  assert.strictEqual(favorites.getFavoritesCount('store'), 1);

  const raw = readStoredJson();
  assert.deepStrictEqual(raw.stores, ['עגליס-אונליין']);
  assert.deepStrictEqual(raw.deals, []);
  assert.deepStrictEqual(raw.billing, []);
  assert.strictEqual(typeof raw.updatedAt, 'string');
});

test('adding multiple stores preserves insertion order', () => {
  resetState();
  favorites.toggleFavorite('store', 'store-a');
  favorites.toggleFavorite('store', 'store-b');
  favorites.toggleFavorite('store', 'store-c');
  assert.deepStrictEqual(favorites.getFavorites().stores, ['store-a', 'store-b', 'store-c']);
  assert.deepStrictEqual(readStoredJson().stores, ['store-a', 'store-b', 'store-c']);
});

test('removing a store returns false and drops it from storage', () => {
  resetState();
  favorites.toggleFavorite('store', 'store-a');
  favorites.toggleFavorite('store', 'store-b');
  assert.strictEqual(favorites.toggleFavorite('store', 'store-a'), false);
  assert.strictEqual(favorites.isFavorite('store', 'store-a'), false);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['store-b']);
  assert.deepStrictEqual(readStoredJson().stores, ['store-b']);
});

test('ids are trimmed before being stored', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', '  vans-online  '), true);
  assert.strictEqual(favorites.isFavorite('store', 'vans-online'), true);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['vans-online']);
});

/* ------------------------------------------------------------------ *
 * 3. Deals & billing — independent collections
 * ------------------------------------------------------------------ */

section('3. Deals & billing — independent collections');

test('deal ids are stored as strings', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('deal', '185816'), true);
  assert.deepStrictEqual(favorites.getFavorites().deals, ['185816']);
  assert.strictEqual(favorites.isFavorite('deal', '185816'), true);
});

test('numeric deal ids are coerced to strings', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('deal', 185816), true);
  assert.deepStrictEqual(favorites.getFavorites().deals, ['185816']);
  assert.strictEqual(favorites.isFavorite('deal', 185816), true);
  assert.strictEqual(favorites.isFavorite('deal', '185816'), true);
  assert.deepStrictEqual(readStoredJson().deals, ['185816']);
});

test('billing items are tracked in their own collection', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('billing', 'max-42'), true);
  assert.deepStrictEqual(favorites.getFavorites().billing, ['max-42']);
  assert.strictEqual(favorites.getFavoritesCount('billing'), 1);
  assert.strictEqual(favorites.getFavoritesCount('store'), 0);
});

test('the same id can be favorited independently in different types', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', 'shared-id'), true);
  assert.strictEqual(favorites.toggleFavorite('deal', 'shared-id'), true);
  assert.strictEqual(favorites.toggleFavorite('billing', 'shared-id'), true);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['shared-id']);
  assert.deepStrictEqual(favorites.getFavorites().deals, ['shared-id']);
  assert.deepStrictEqual(favorites.getFavorites().billing, ['shared-id']);
  assert.strictEqual(favorites.toggleFavorite('store', 'shared-id'), false);
  assert.strictEqual(favorites.isFavorite('deal', 'shared-id'), true);
  assert.strictEqual(favorites.isFavorite('billing', 'shared-id'), true);
});

/* ------------------------------------------------------------------ *
 * 4. Toggle behavior
 * ------------------------------------------------------------------ */

section('4. Toggle behavior');

test('toggling twice adds then removes (true -> false)', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', 'flip-store'), true);
  assert.strictEqual(favorites.getFavoritesCount(), 1);
  assert.strictEqual(favorites.toggleFavorite('store', 'flip-store'), false);
  assert.strictEqual(favorites.getFavoritesCount(), 0);
  assert.deepStrictEqual(favorites.getFavorites(), {
    stores: [],
    deals: [],
    billing: [],
    updatedAt: favorites.getFavorites().updatedAt,
  });
});

test('repeated toggling never duplicates an id', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', 'repeat-store'), true);
  assert.strictEqual(favorites.toggleFavorite('store', 'repeat-store'), false);
  assert.strictEqual(favorites.toggleFavorite('store', 'repeat-store'), true);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['repeat-store']);
  assert.deepStrictEqual(readStoredJson().stores, ['repeat-store']);
  assert.strictEqual(favorites.getFavoritesCount('store'), 1);
});

test('toggling one item leaves other items untouched', () => {
  resetState();
  favorites.toggleFavorite('store', 'keep-a');
  favorites.toggleFavorite('store', 'keep-b');
  favorites.toggleFavorite('deal', 'keep-deal');
  favorites.toggleFavorite('store', 'remove-me');
  assert.strictEqual(favorites.toggleFavorite('store', 'remove-me'), false);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['keep-a', 'keep-b']);
  assert.deepStrictEqual(favorites.getFavorites().deals, ['keep-deal']);
});

/* ------------------------------------------------------------------ *
 * 5. Count calculations
 * ------------------------------------------------------------------ */

section('5. Count calculations');

test('getFavoritesCount() returns per-type counts and the total', () => {
  resetState();
  favorites.toggleFavorite('store', 's1');
  favorites.toggleFavorite('store', 's2');
  favorites.toggleFavorite('deal', 'd1');
  favorites.toggleFavorite('billing', 'b1');
  favorites.toggleFavorite('billing', 'b2');
  favorites.toggleFavorite('billing', 'b3');

  assert.strictEqual(favorites.getFavoritesCount(), 6);
  assert.strictEqual(favorites.getFavoritesCount('store'), 2);
  assert.strictEqual(favorites.getFavoritesCount('deal'), 1);
  assert.strictEqual(favorites.getFavoritesCount('billing'), 3);
});

test('plural type aliases are accepted everywhere', () => {
  resetState();
  favorites.toggleFavorite('stores', 'alias-store');
  favorites.toggleFavorite('deals', 'alias-deal');
  assert.strictEqual(favorites.isFavorite('stores', 'alias-store'), true);
  assert.strictEqual(favorites.isFavorite('deals', 'alias-deal'), true);
  assert.strictEqual(favorites.getFavoritesCount('stores'), 1);
  assert.strictEqual(favorites.getFavoritesCount('deals'), 1);
  assert.strictEqual(favorites.getFavoritesCount(), 2);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['alias-store']);
  assert.deepStrictEqual(favorites.getFavorites().deals, ['alias-deal']);
});

test('counts update after removals', () => {
  resetState();
  favorites.toggleFavorite('store', 's1');
  favorites.toggleFavorite('deal', 'd1');
  favorites.toggleFavorite('store', 's1');
  assert.strictEqual(favorites.getFavoritesCount('store'), 0);
  assert.strictEqual(favorites.getFavoritesCount('deal'), 1);
  assert.strictEqual(favorites.getFavoritesCount(), 1);
});

test('invalid types return 0 without throwing', () => {
  resetState();
  favorites.toggleFavorite('store', 's1');
  assert.strictEqual(favorites.getFavoritesCount('widgets'), 0);
  assert.strictEqual(favorites.getFavoritesCount('store '), 1);
  assert.strictEqual(favorites.getFavoritesCount('all'), 1);
});

/* ------------------------------------------------------------------ *
 * 6. JSON export & import
 * ------------------------------------------------------------------ */

section('6. JSON export & import');

test('exportFavoritesJson() serializes exactly the current favorites', () => {
  resetState();
  favorites.toggleFavorite('store', 'export-store');
  favorites.toggleFavorite('deal', 'export-deal');
  favorites.toggleFavorite('billing', 'export-billing');

  const json = favorites.exportFavoritesJson();
  assert.strictEqual(typeof json, 'string');
  assert.deepStrictEqual(JSON.parse(json), favorites.getFavorites());
});

test('importFavoritesJson() restores an exported backup', () => {
  resetState();
  favorites.toggleFavorite('store', 'roundtrip-store');
  favorites.toggleFavorite('deal', '111');
  favorites.toggleFavorite('billing', 'roundtrip-bill');
  const before = favorites.getFavorites();
  const json = favorites.exportFavoritesJson();

  resetState();
  assert.strictEqual(favorites.importFavoritesJson(json), true);
  assert.deepStrictEqual(favorites.getFavorites(), before);
  assert.strictEqual(favorites.getFavoritesCount(), 3);
  assert.strictEqual(favorites.isFavorite('store', 'roundtrip-store'), true);
});

test('import replaces (does not merge with) the previous state', () => {
  resetState();
  favorites.toggleFavorite('store', 'old-store');
  assert.strictEqual(favorites.importFavoritesJson(JSON.stringify({ stores: ['new-store'], deals: [], billing: [] })), true);
  assert.deepStrictEqual(favorites.getFavorites().stores, ['new-store']);
  assert.strictEqual(favorites.isFavorite('store', 'old-store'), false);
});

test('import rejects malformed JSON and non-object payloads', () => {
  resetState();
  assert.strictEqual(favorites.importFavoritesJson('{not valid json'), false);
  assert.strictEqual(favorites.importFavoritesJson(''), false);
  assert.strictEqual(favorites.importFavoritesJson('   '), false);
  assert.strictEqual(favorites.importFavoritesJson('null'), false);
  assert.strictEqual(favorites.importFavoritesJson('"a string"'), false);
  assert.strictEqual(favorites.importFavoritesJson('42'), false);
  assert.strictEqual(favorites.importFavoritesJson('[1, 2, 3]'), false);
  assert.strictEqual(favorites.importFavoritesJson(undefined), false);
  assert.strictEqual(favorites.importFavoritesJson(null), false);
  assert.strictEqual(favorites.importFavoritesJson({ stores: [] }), false);
});

test('import rejects payloads with wrong field types or unknown schema', () => {
  resetState();
  assert.strictEqual(favorites.importFavoritesJson('{"stores": "not-an-array"}'), false);
  assert.strictEqual(favorites.importFavoritesJson('{"stores": [], "deals": 42}'), false);
  assert.strictEqual(favorites.importFavoritesJson('{"favorites": ["x"]}'), false);
  assert.strictEqual(favorites.importFavoritesJson('{}'), false);
});

test('a rejected import leaves existing favorites untouched', () => {
  resetState();
  favorites.toggleFavorite('store', 'precious-store');
  const before = favorites.getFavorites();
  assert.strictEqual(favorites.importFavoritesJson('{"stores": "broken"}'), false);
  assert.strictEqual(favorites.importFavoritesJson('definitely not json'), false);
  assert.deepStrictEqual(favorites.getFavorites(), before);
});

test('import sanitizes entries: trim, numeric coercion and de-duplication', () => {
  resetState();
  const json = JSON.stringify({
    stores: ['  store-a  ', 'store-a', '', 'store-b'],
    deals: [12345, '12345'],
    billing: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  assert.strictEqual(favorites.importFavoritesJson(json), true);
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, ['store-a', 'store-b']);
  assert.deepStrictEqual(current.deals, ['12345']);
  assert.deepStrictEqual(current.billing, []);
  assert.strictEqual(current.updatedAt, '2026-01-01T00:00:00.000Z');
});

test('import accepts partial payloads and fills missing collections', () => {
  resetState();
  assert.strictEqual(favorites.importFavoritesJson('{"stores": ["only-stores"]}'), true);
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, ['only-stores']);
  assert.deepStrictEqual(current.deals, []);
  assert.deepStrictEqual(current.billing, []);
  assert.strictEqual(typeof current.updatedAt, 'string');
});

/* ------------------------------------------------------------------ *
 * 7. Reactive events
 * ------------------------------------------------------------------ */

section('7. Reactive events');

test('adding a store dispatches behatsdaa:favorites-updated', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('store', 'event-store'), true);
  assert.strictEqual(dispatchedEvents.length, 1);
  const event = dispatchedEvents[0];
  assert.strictEqual(event.type, EVENT_NAME);
  assert.deepStrictEqual(event.detail, { type: 'store', id: 'event-store', isFavorite: true, count: 1 });
});

test('removing a store dispatches with isFavorite=false and updated count', () => {
  resetState();
  favorites.toggleFavorite('store', 'event-store-a');
  favorites.toggleFavorite('store', 'event-store-b');
  dispatchedEvents.length = 0;
  assert.strictEqual(favorites.toggleFavorite('store', 'event-store-a'), false);
  assert.strictEqual(dispatchedEvents.length, 1);
  assert.deepStrictEqual(dispatchedEvents[0].detail, { type: 'store', id: 'event-store-a', isFavorite: false, count: 1 });
});

test('events carry singular canonical type names for deals and billing', () => {
  resetState();
  favorites.toggleFavorite('deals', '555');
  favorites.toggleFavorite('billing', 'bill-7');
  assert.strictEqual(dispatchedEvents.length, 2);
  assert.deepStrictEqual(dispatchedEvents[0].detail, { type: 'deal', id: '555', isFavorite: true, count: 1 });
  assert.deepStrictEqual(dispatchedEvents[1].detail, { type: 'billing', id: 'bill-7', isFavorite: true, count: 1 });
});

test('every toggle dispatches exactly one event', () => {
  resetState();
  favorites.toggleFavorite('store', 'one');
  favorites.toggleFavorite('store', 'two');
  favorites.toggleFavorite('store', 'one');
  assert.strictEqual(dispatchedEvents.length, 3);
  assert.deepStrictEqual(
    dispatchedEvents.map((event) => event.detail.isFavorite),
    [true, true, false]
  );
});

test('clearAllFavorites() dispatches a single bulk event', () => {
  resetState();
  favorites.toggleFavorite('store', 's1');
  favorites.toggleFavorite('deal', 'd1');
  dispatchedEvents.length = 0;
  favorites.clearAllFavorites();
  assert.strictEqual(favorites.getFavoritesCount(), 0);
  assert.strictEqual(dispatchedEvents.length, 1);
  assert.deepStrictEqual(dispatchedEvents[0].detail, { type: 'all', id: null, isFavorite: false, count: 0 });
});

test('importFavoritesJson() dispatches a bulk event with the restored total', () => {
  resetState();
  dispatchedEvents.length = 0;
  const json = JSON.stringify({ stores: ['s1'], deals: ['d1', 'd2'], billing: ['b1'] });
  assert.strictEqual(favorites.importFavoritesJson(json), true);
  assert.strictEqual(dispatchedEvents.length, 1);
  assert.deepStrictEqual(dispatchedEvents[0].detail, { type: 'all', id: null, isFavorite: false, count: 4 });
});

test('invalid toggles dispatch no event', () => {
  resetState();
  assert.strictEqual(favorites.toggleFavorite('widgets', 'x'), false);
  assert.strictEqual(favorites.toggleFavorite('store', ''), false);
  assert.strictEqual(favorites.toggleFavorite('store', null), false);
  assert.strictEqual(favorites.toggleFavorite('store', undefined), false);
  assert.strictEqual(favorites.toggleFavorite('store', {}), false);
  assert.strictEqual(dispatchedEvents.length, 0);
});

/* ------------------------------------------------------------------ *
 * 8. Corrupted data & fallback robustness
 * ------------------------------------------------------------------ */

section('8. Corrupted data & fallback robustness');

test('malformed JSON in storage is treated as empty and self-healed', () => {
  resetState();
  globalThis.localStorage.setItem(STORAGE_KEY, '{this is not json');
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, []);
  assert.deepStrictEqual(current.deals, []);
  assert.deepStrictEqual(current.billing, []);
  assert.strictEqual(favorites.getFavoritesCount(), 0);
  // The corrupted value must have been repaired with a valid schema.
  const healed = readStoredJson();
  assert.deepStrictEqual(healed.stores, []);
  assert.deepStrictEqual(healed.deals, []);
  assert.deepStrictEqual(healed.billing, []);
});

test('toggles keep working after corrupted data is encountered', () => {
  resetState();
  globalThis.localStorage.setItem(STORAGE_KEY, 'not-json-at-all');
  assert.strictEqual(favorites.toggleFavorite('store', 'recovered-store'), true);
  assert.strictEqual(favorites.isFavorite('store', 'recovered-store'), true);
  assert.strictEqual(favorites.getFavoritesCount('store'), 1);
  assert.deepStrictEqual(readStoredJson().stores, ['recovered-store']);
});

test('a JSON null payload is treated as empty', () => {
  resetState();
  globalThis.localStorage.setItem(STORAGE_KEY, 'null');
  assert.strictEqual(favorites.getFavoritesCount(), 0);
  assert.strictEqual(favorites.isFavorite('deal', '1'), false);
});

test('wrong field types degrade gracefully per field', () => {
  resetState();
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stores: ['kept'], deals: 'oops', billing: 42, updatedAt: 123 }));
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, ['kept']);
  assert.deepStrictEqual(current.deals, []);
  assert.deepStrictEqual(current.billing, []);
  assert.ok(!Number.isNaN(Date.parse(current.updatedAt)), 'invalid updatedAt is replaced with a valid timestamp');
});

test('legacy flat-array data is migrated to the typed schema', () => {
  resetState();
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(['legacy-store', '99991', 'another-store', '99991']));
  const migrated = favorites.getFavorites();
  assert.deepStrictEqual(migrated.stores, ['legacy-store', 'another-store']);
  assert.deepStrictEqual(migrated.deals, ['99991']);
  assert.deepStrictEqual(migrated.billing, []);
  // Migration is persisted so later reads see the canonical schema.
  const persisted = readStoredJson();
  assert.deepStrictEqual(persisted.stores, ['legacy-store', 'another-store']);
  assert.deepStrictEqual(persisted.deals, ['99991']);
});

test('duplicate and non-string ids in storage are sanitized on read', () => {
  resetState();
  globalThis.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ stores: ['dup', 'dup', '  spaced  '], deals: [111, '111'], billing: [null, {}, true], updatedAt: 'x' })
  );
  const current = favorites.getFavorites();
  assert.deepStrictEqual(current.stores, ['dup', 'spaced']);
  assert.deepStrictEqual(current.deals, ['111']);
  assert.deepStrictEqual(current.billing, []);
});

test('mutating the object returned by getFavorites() cannot corrupt state', () => {
  resetState();
  favorites.toggleFavorite('store', 'original');
  const snapshot = favorites.getFavorites();
  snapshot.stores.push('injected');
  snapshot.deals.push('injected');
  snapshot.billing.push('injected');
  assert.deepStrictEqual(favorites.getFavorites().stores, ['original']);
  assert.strictEqual(favorites.getFavoritesCount(), 1);
  assert.deepStrictEqual(readStoredJson().stores, ['original']);
});

test('blocked localStorage falls back to memory without throwing', () => {
  resetState();
  globalThis.localStorage = new ThrowingStorage();
  try {
    assert.deepStrictEqual(favorites.getFavorites().stores, []);
    assert.strictEqual(favorites.toggleFavorite('store', 'offline-store'), true);
    assert.strictEqual(favorites.isFavorite('store', 'offline-store'), true);
    assert.strictEqual(favorites.getFavoritesCount(), 1);
    assert.strictEqual(dispatchedEvents.length, 1);
    assert.deepStrictEqual(dispatchedEvents[0].detail, { type: 'store', id: 'offline-store', isFavorite: true, count: 1 });
    assert.strictEqual(favorites.toggleFavorite('deal', 'offline-deal'), true);
    assert.strictEqual(favorites.getFavoritesCount(), 2);
    favorites.clearAllFavorites();
    assert.strictEqual(favorites.getFavoritesCount(), 0);
  } finally {
    globalThis.localStorage = new MemoryStorage();
  }
});

test('a completely missing localStorage global falls back to memory', () => {
  resetState();
  delete globalThis.localStorage;
  try {
    assert.strictEqual(favorites.toggleFavorite('billing', 'no-storage-bill'), true);
    assert.strictEqual(favorites.isFavorite('billing', 'no-storage-bill'), true);
    assert.strictEqual(favorites.getFavoritesCount(), 1);
    assert.strictEqual(favorites.exportFavoritesJson().includes('no-storage-bill'), true);
  } finally {
    globalThis.localStorage = new MemoryStorage();
  }
});

test('a missing window does not break mutations (events are best-effort)', () => {
  resetState();
  delete globalThis.window;
  try {
    assert.strictEqual(favorites.toggleFavorite('store', 'no-window-store'), true);
    assert.strictEqual(favorites.isFavorite('store', 'no-window-store'), true);
  } finally {
    globalThis.window = windowMock;
  }
});

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

console.log('\n====================================================');
if (failed === 0) {
  console.log(`🎉 All ${passed} favorites tests passed successfully!`);
} else {
  console.log(`❌ ${failed} of ${passed + failed} favorites tests failed.`);
  process.exitCode = 1;
}
console.log('====================================================\n');
