const CACHE_KEY = "aos.session.active-store-by-org";

type ActiveStoreCache = Record<string, string>;

function readCache(): ActiveStoreCache {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      window.localStorage.removeItem(CACHE_KEY);
      return {};
    }
    return parsed as ActiveStoreCache;
  } catch {
    window.localStorage.removeItem(CACHE_KEY);
    return {};
  }
}

function writeCache(cache: ActiveStoreCache) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/** Convenience cache only — never treat as source of truth. */
export function readCachedActiveStoreId(organizationId: string): string | null {
  const value = readCache()[organizationId];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function writeCachedActiveStoreId(organizationId: string, storeId: string) {
  const next = { ...readCache(), [organizationId]: storeId };
  writeCache(next);
}

export function clearCachedActiveStoreId(organizationId: string) {
  const next = { ...readCache() };
  delete next[organizationId];
  writeCache(next);
}

export function clearAllCachedActiveStoreIds() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(CACHE_KEY);
}
