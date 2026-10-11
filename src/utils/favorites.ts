/**
 * Behatsdaa Favorites (Bookmarks) Module
 * Standalone TypeScript module that persists user favorites.
 */

export const FAVORITES_STORAGE_KEY = 'behatsdaa_user_favorites';
export const FAVORITES_UPDATED_EVENT = 'behatsdaa:favorites-updated';

export interface FavoritesPayload {
  stores: string[];
  deals: string[];
  billing: string[];
  updatedAt: string;
}

export type FavoriteTypeKey = 'stores' | 'deals' | 'billing';
export type FavoriteType = 'store' | 'deal' | 'billing';

const FAVORITE_KEYS: FavoriteTypeKey[] = ['stores', 'deals', 'billing'];

const TYPE_ALIASES: Record<string, FavoriteTypeKey> = {
  store: 'stores',
  stores: 'stores',
  deal: 'deals',
  deals: 'deals',
  billing: 'billing',
};

const KEY_TO_TYPE: Record<FavoriteTypeKey, FavoriteType> = {
  stores: 'store',
  deals: 'deal',
  billing: 'billing'
};

const STORAGE_PROBE_KEY = '__behatsdaa_favorites_probe__';
let memoryFavorites: FavoritesPayload | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyFavorites(): FavoritesPayload {
  return { stores: [], deals: [], billing: [], updatedAt: nowIso() };
}

function cloneFavorites(favorites: FavoritesPayload): FavoritesPayload {
  return {
    stores: favorites.stores.slice(),
    deals: favorites.deals.slice(),
    billing: favorites.billing.slice(),
    updatedAt: favorites.updatedAt,
  };
}

function normalizeType(type: any): FavoriteTypeKey | null {
  if (typeof type !== 'string') return null;
  return TYPE_ALIASES[type.trim().toLowerCase()] || null;
}

function normalizeId(id: any): string | null {
  if (typeof id === 'string') {
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return null;
}

function normalizeIdList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const id = normalizeId(value[i]);
    if (id !== null && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function isValidTimestamp(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalFavorites(value: any): boolean {
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

function coerceFavorites(value: any): FavoritesPayload {
  if (Array.isArray(value)) {
    const stores: string[] = [];
    const deals: string[] = [];
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

function totalCount(favorites: FavoritesPayload): number {
  return favorites.stores.length + favorites.deals.length + favorites.billing.length;
}

function getSafeStorage(): Storage | null {
  try {
    const storage = typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : undefined;
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

function readMemoryFavorites(): FavoritesPayload {
  if (!memoryFavorites) memoryFavorites = createEmptyFavorites();
  return cloneFavorites(memoryFavorites);
}

function writeMemoryFavorites(favorites: FavoritesPayload) {
  memoryFavorites = cloneFavorites(favorites);
}

function repairStorage(storage: Storage, favorites: FavoritesPayload) {
  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // fallback
  }
}

function readFavorites(): FavoritesPayload {
  const storage = getSafeStorage();
  if (!storage) return readMemoryFavorites();

  let raw: string | null;
  try {
    raw = storage.getItem(FAVORITES_STORAGE_KEY);
  } catch {
    return readMemoryFavorites();
  }
  if (raw === null || raw === undefined || raw === '') return createEmptyFavorites();

  let parsed: any;
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

function persistFavorites(favorites: FavoritesPayload): FavoritesPayload {
  const snapshot = cloneFavorites(favorites);
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(snapshot));
      return snapshot;
    } catch {
      // Storage quota / error
    }
  }
  writeMemoryFavorites(snapshot);
  return snapshot;
}

function resolveEventTarget(): any {
  if (typeof window !== 'undefined' && window && typeof (window as any).dispatchEvent === 'function') {
    return window;
  }
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).dispatchEvent === 'function') {
    return globalThis;
  }
  return null;
}

function resolveCustomEventConstructors(): any[] {
  const constructors: any[] = [];
  if (typeof window !== 'undefined' && window && typeof (window as any).CustomEvent === 'function') {
    constructors.push((window as any).CustomEvent);
  }
  if (typeof CustomEvent === 'function') constructors.push(CustomEvent);
  return constructors;
}

function emitFavoritesUpdated(type: string, id: string | null, isFav: boolean, count: number) {
  try {
    const target = resolveEventTarget();
    if (!target) return;
    const detail = { type, id, isFavorite: isFav, count };
    const constructors = resolveCustomEventConstructors();
    for (const EventCtor of constructors) {
      try {
        target.dispatchEvent(new EventCtor(FAVORITES_UPDATED_EVENT, { detail }));
        return;
      } catch {
        // try next
      }
    }
  } catch {
    // best-effort
  }
}

export function getFavorites(): FavoritesPayload {
  return readFavorites();
}

export function isFavorite(type: any, id: any): boolean {
  const key = normalizeType(type);
  const normalizedId = normalizeId(id);
  if (!key || normalizedId === null) return false;
  return readFavorites()[key].includes(normalizedId);
}

export function toggleFavorite(type: any, id: any): boolean {
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

export function getFavoritesCount(type?: any): number {
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

export function clearAllFavorites() {
  const empty = createEmptyFavorites();
  persistFavorites(empty);
  emitFavoritesUpdated('all', null, false, 0);
}

export function exportFavoritesJson(): string {
  return JSON.stringify(readFavorites());
}

export function importFavoritesJson(jsonStr: any): boolean {
  if (typeof jsonStr !== 'string' || jsonStr.trim() === '') return false;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;

  const hasKnownKey = FAVORITE_KEYS.some(key => Object.prototype.hasOwnProperty.call(parsed, key));
  if (!hasKnownKey) return false;

  for (const key of FAVORITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(parsed, key) && !Array.isArray(parsed[key])) return false;
  }

  const restored = coerceFavorites(parsed);
  persistFavorites(restored);
  emitFavoritesUpdated('all', null, false, totalCount(restored));
  return true;
}
