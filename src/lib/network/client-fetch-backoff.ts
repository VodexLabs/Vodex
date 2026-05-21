/**
 * Client-side fetch throttle — avoids hammering APIs when the same error repeats.
 */

const lastAttempt = new Map<string, number>();
const lastErrorAt = new Map<string, number>();
const ERROR_COOLDOWN_MS = 30_000;

export function shouldThrottleClientFetch(key: string): boolean {
  const errAt = lastErrorAt.get(key);
  if (!errAt) return false;
  return Date.now() - errAt < ERROR_COOLDOWN_MS;
}

export function markClientFetchAttempt(key: string): void {
  lastAttempt.set(key, Date.now());
}

export function markClientFetchError(key: string): void {
  lastErrorAt.set(key, Date.now());
}

export function clearClientFetchError(key: string): void {
  lastErrorAt.delete(key);
}

export function markClientFetchSuccess(key: string): void {
  lastErrorAt.delete(key);
  lastAttempt.set(key, Date.now());
}
