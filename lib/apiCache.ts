// lib/apiCache.ts — simple in-memory TTL cache for API routes
// Avoids repeated blockchain RPC calls on every page load.

type Entry = { data: any; expiresAt: number };
const store = new Map<string, Entry>();

export function cacheGet(key: string): any | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { store.delete(key); return null; }
  return e.data;
}

export function cacheSet(key: string, data: any, ttlMs = 10_000) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
