import { MAX_CLIENT_CACHE_JSON_BYTES } from "@/lib/diagnostics/payload-limits";

type CacheEntry<T> = { data: T; at: number };

const cache = new Map<string, CacheEntry<unknown>>();

function estimateJsonBytes(data: unknown): number {
  try {
    const s = JSON.stringify(data);
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(s).length;
    }
    return s.length * 2;
  } catch {
    return MAX_CLIENT_CACHE_JSON_BYTES + 1;
  }
}
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string, maxAgeMs: number): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > maxAgeMs) return null;
  return hit.data as T;
}

export function setCached<T>(key: string, data: T) {
  if (estimateJsonBytes(data) > MAX_CLIENT_CACHE_JSON_BYTES) return;
  cache.set(key, { data, at: Date.now() });
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Dedupe concurrent fetches; optional stale-while-revalidate via cached fallback. */
export async function fetchDedupe<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  opts?: { maxAgeMs?: number; force?: boolean },
): Promise<T> {
  const maxAge = opts?.maxAgeMs ?? 30_000;
  if (!opts?.force) {
    const cached = getCached<T>(key, maxAge);
    if (cached != null) return cached;
  }

  const pending = inflight.get(key);
  if (pending && !opts?.force) return pending as Promise<T>;

  const ac = new AbortController();
  const promise = fetcher(ac.signal)
    .then((data) => {
      setCached(key, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
