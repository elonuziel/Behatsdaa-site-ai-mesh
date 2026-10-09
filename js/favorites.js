/**
 * Behatsdaa Favorites (Bookmarks) Module
 *
 * Standalone, dependency-free ES module that persists user favorites in
 * `localStorage` under the key `behatsdaa_user_favorites` using the schema:
 *
 *   {
 *     stores:    string[],
 *     deals:     string[],
 *     billing:   string[],
 *     updatedAt: string  // ISO-8601 timestamp of the last mutation
 *   }
 *
 * Every add/remove mutation dispatches a reactive browser event so any UI
 * component can update in real time:
 *
 *   window.dispatchEvent(new CustomEvent('behatsdaa:favorites-updated', {
 *     detail: { type, id, isFavorite, count }
 *   }))
 *
 * `type` is the canonical singular name ('store' | 'deal' | 'billing') and
 * `count` is the number of favorites of that type after the mutation.
 * Bulk mutations (clearAllFavorites / importFavoritesJson) emit a single
 * event with `type: 'all'`, `id: null` and the total `count`.
 *
 * Robustness guarantees:
 * - Safe to import in Node.js (no localStorage / window required).
 * - Never throws when localStorage is missing, blocked (SecurityError,
 *   private mode), or throws on quota: an in-memory fallback is used.
 * - Malformed JSON and legacy/wrong-shaped stored values degrade to an empty
 *   (or migrated) state, and corrupted persisted data is self-healed.
 */

/** localStorage key holding the favorites payload. */
export const FAVORITES_STORAGE_KEY = 'behatsdaa_user_favorites';

/** Name of the CustomEvent dispatched after every mutation. */
export const FAVORITES_UPDATED_EVENT = 'behatsdaa:favorites-updated';

/** Internal schema keys, in canonical order. */
const FAVORITE_KEYS = ['stores', 'deals', 'billing'];

/** Accepted public type names (singular and plural) mapped to schema keys. */
const TYPE_ALIASES = {
  store: 'stores',
  stores: 'stores',
  deal: 'deals',
  deals: 'deals',
  billing: 'billing',
};

/** Schema key mapped back to the canonical singular type name. */
const KEY_TO_TYPE = { stores: 'store', deals: 'deal', billing: 'billing' };

/** Throwaway key used to probe whether localStorage is writable. */
const STORAGE_PROBE_KEY = '__behatsdaa_favorites_probe__';

/**
 * In-memory fallback, used only while localStorage is unavailable or blocked.
 * When a working localStorage exists, it remains the single source of truth.
 */
let memoryFavorites = null;

/* ------------------------------------------------------------------ *
 * Generic helpers
 * ------------------------------------------------------------------ */

function nowIso() {
  return new Date().toISOString();
}

function createEmptyFavorites() {
  return { stores: [], deals: [], billing: [], updatedAt: nowIso() };
}

function cloneFavorites(favorites) {
  return {
    stores: favorites.stores.slice(),
    deals: favorites.deals.slice(),
    billing: favorites.billing.slice(),
    updatedAt: favorites.updatedAt,
  };
}

/** 'store' | 'stores' | 'deal' | 'deals' | 'billing' -> schema key, else null. */
function normalizeType(type) {
  if (typeof type !== 'string') return null;
  return TYPE_ALIASES[type.trim().toLowerCase()] || null;
}

/** Coerces an id to a trimmed string; returns null for unusable values. */
function normalizeId(id) {
  if (typeof id === 'string') {
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

/** Sanitizes an array of ids: trims, coerces, drops invalid values, de-dupes. */
function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (let i = 0; i < value.length; i++) {
    const id = normalizeId(value[i]);
    if (id !== null && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function isValidTimestamp(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** True when a parsed value already matches the persisted schema exactly. */
function isCanonicalFavorites(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray(value.stores) &&
    Array.isArray(value.deals) &&
    Array.isArray(value.billing) &&
    typeof value.updatedAt === 'string'
  );
}

/**
 * Coerces any parsed JSON value into the favorites schema.
 * - Objects: sanitized per-field, missing/invalid updatedAt becomes now.
 * - Legacy flat arrays: numeric ids migrate to `deals`, the rest to `stores`.
 * - Anything else: empty schema.
 */
function coerceFavorites(value) {
  if (Array.isArray(value)) {
    const stores = [];
    const deals = [];
    for (let i = 0; i < value.length; i++) {
      const id = normalizeId(value[i]);
      if (id === null) continue;
      if (/^\d+$/.test(id)) deals.push(id);
      else stores.push(id);
    }
    return {
      stores: normalizeIdList(stores),
      deals: normalizeIdList(deals),
      billing: [],
      updatedAt: nowIso(),
    };
  }
  if (value && typeof value === 'object') {
    return {
      stores: normalizeIdList(value.stores),
      deals: normalizeIdList(value.deals),
      billing: normalizeIdList(value.billing),
      updatedAt: isValidTimestamp(value.updatedAt) ? value.updatedAt : nowIso(),
    };
  }
  return createEmptyFavorites();
}

function totalCount(favorites) {
  return favorites.stores.length + favorites.deals.length + favorites.billing.length;
}

/* ------------------------------------------------------------------ *
 * Storage access (with graceful degradation)
 * ------------------------------------------------------------------ */

/**
 * Returns the localStorage instance only when it is present and writable.
 * Any access error (SecurityError, private mode, quota) yields null so the
 * caller can transparently use the in-memory fallback.
 */
function getSafeStorage() {
  try {
    const storage = typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      return null;
    }
    storage.setItem(STORAGE_PROBE_KEY, '1');
    storage.removeItem(STORAGE_PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function readMemoryFavorites() {
  if (!memoryFavorites) memoryFavorites = createEmptyFavorites();
  return cloneFavorites(memoryFavorites);
}

function writeMemoryFavorites(favorites) {
  memoryFavorites = cloneFavorites(favorites);
}

/** Best-effort rewrite of persisted data after corruption or legacy migration. */
function repairStorage(storage, favorites) {
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Storage became unavailable mid-repair; the in-memory fallback still applies.
  }
}

/** Reads, sanitizes and self-heals the current favorites state. */
function readFavorites() {
  const storage = getSafeStorage();
  if (!storage) return readMemoryFavorites();

  let raw = null;
  try {
    raw = storage.getItem(FAVORITES_STORAGE_KEY);
  } catch {
    return readMemoryFavorites();
  }
  if (raw === null || raw === undefined || raw === '') return createEmptyFavorites();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const healed = createEmptyFavorites();
    repairStorage(storage, healed);
    return healed;
  }

  const favorites = coerceFavorites(parsed);
  if (!isCanonicalFavorites(parsed)) repairStorage(storage, favorites);
  return favorites;
}

/** Persists a snapshot; falls back to memory when storage rejects the write. */
function persistFavorites(favorites) {
  const snapshot = cloneFavorites(favorites);
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(snapshot));
      return snapshot;
    } catch {
      // Write blocked (quota / private mode): fall through to memory.
    }
  }
  writeMemoryFavorites(snapshot);
  return snapshot;
}

/* ------------------------------------------------------------------ *
 * Reactive events
 * ------------------------------------------------------------------ */

function resolveEventTarget() {
  if (typeof window !== 'undefined' && window && typeof window.dispatchEvent === 'function') {
    return window;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.dispatchEvent === 'function') {
    return globalThis;
  }
  return null;
}

/**
 * Candidate CustomEvent constructors, most environment-appropriate first.
 * `window.CustomEvent` wins when present so events dispatched on a jsdom or
 * iframe window belong to that window's realm (Node's global CustomEvent
 * would be rejected by jsdom's dispatchEvent).
 */
function resolveCustomEventConstructors() {
  const constructors = [];
  if (typeof window !== 'undefined' && window && typeof window.CustomEvent === 'function') {
    constructors.push(window.CustomEvent);
  }
  if (typeof CustomEvent === 'function') constructors.push(CustomEvent);
  return constructors;
}

/**
 * Dispatches 'behatsdaa:favorites-updated' with the given detail.
 * Notifications must never break a mutation, so every failure is swallowed.
 */
function emitFavoritesUpdated(type, id, isFavorite, count) {
  try {
    const target = resolveEventTarget();
    if (!target) return;
    const detail = { type, id, isFavorite, count };
    const constructors = resolveCustomEventConstructors();
    for (const EventCtor of constructors) {
      try {
        target.dispatchEvent(new EventCtor(FAVORITES_UPDATED_EVENT, { detail }));
        return;
      } catch {
        // Constructor/dispatch rejected by this environment; try the next one.
      }
    }
  } catch {
    // Ignore: reactive notifications are best-effort.
  }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Returns the current favorites as a defensive copy of the persisted schema.
 *
 * @returns {{ stores: string[], deals: string[], billing: string[], updatedAt: string }}
 */
export function getFavorites() {
  return readFavorites();
}

/**
 * Checks whether an item is currently favorited.
 *
 * @param {'store'|'deal'|'billing'} type - Item type (plural aliases accepted).
 * @param {string|number} id - Item id.
 * @returns {boolean} True when the item is favorited.
 */
export function isFavorite(type, id) {
  const key = normalizeType(type);
  const normalizedId = normalizeId(id);
  if (!key || normalizedId === null) return false;
  return readFavorites()[key].includes(normalizedId);
}

/**
 * Toggles the favorite status of an item.
 *
 * @param {'store'|'deal'|'billing'} type - Item type (plural aliases accepted).
 * @param {string|number} id - Item id.
 * @returns {boolean} True when the item was added, false when removed
 *                    (also false, with no mutation/event, for invalid input).
 */
export function toggleFavorite(type, id) {
  const key = normalizeType(type);
  const normalizedId = normalizeId(id);
  if (!key || normalizedId === null) return false;

  const favorites = readFavorites();
  const list = favorites[key];
  const index = list.indexOf(normalizedId);
  const isNowFavorite = index === -1;

  if (isNowFavorite) list.push(normalizedId);
  else list.splice(index, 1);
  favorites.updatedAt = nowIso();

  persistFavorites(favorites);
  emitFavoritesUpdated(KEY_TO_TYPE[key], normalizedId, isNowFavorite, list.length);
  return isNowFavorite;
}

/**
 * Returns the favorites count for a type, or the total when omitted.
 *
 * @param {'store'|'deal'|'billing'|'all'} [type] - Optional type filter.
 * @returns {number} Count of that type, or the total favorites count.
 */
export function getFavoritesCount(type) {
  const favorites = readFavorites();
  if (type === undefined || type === null || type === '') return totalCount(favorites);
  if (typeof type === 'string') {
    const normalized = type.trim().toLowerCase();
    if (normalized === 'all' || normalized === 'total') return totalCount(favorites);
  }
  const key = normalizeType(type);
  if (!key) return 0;
  return favorites[key].length;
}

/**
 * Wipes every favorite from both localStorage and the in-memory fallback,
 * then emits a single bulk 'all' event.
 */
export function clearAllFavorites() {
  const empty = createEmptyFavorites();
  persistFavorites(empty);
  emitFavoritesUpdated('all', null, false, 0);
}

/**
 * Serializes the current favorites into a backup JSON string.
 *
 * @returns {string} JSON string matching the persisted schema.
 */
export function exportFavoritesJson() {
  return JSON.stringify(readFavorites());
}

/**
 * Restores favorites from a JSON backup (as produced by exportFavoritesJson).
 * The payload must be an object containing at least one of the schema arrays;
 * present fields must be arrays, and array entries are sanitized (trimmed,
 * numbers coerced to strings, invalid values dropped, duplicates removed).
 * A rejected import leaves the current favorites untouched.
 *
 * @param {string} jsonStr - JSON backup string.
 * @returns {boolean} True when the import succeeded, false when rejected.
 */
export function importFavoritesJson(jsonStr) {
  if (typeof jsonStr !== 'string' || jsonStr.trim() === '') return false;

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

  const hasKnownKey = FAVORITE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(parsed, key));
  if (!hasKnownKey) return false;

  for (const key of FAVORITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(parsed, key) && !Array.isArray(parsed[key])) return false;
  }

  const favorites = {
    stores: normalizeIdList(parsed.stores),
    deals: normalizeIdList(parsed.deals),
    billing: normalizeIdList(parsed.billing),
    updatedAt: isValidTimestamp(parsed.updatedAt) ? parsed.updatedAt : nowIso(),
  };

  persistFavorites(favorites);
  emitFavoritesUpdated('all', null, false, totalCount(favorites));
  return true;
}
