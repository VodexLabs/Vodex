import { resolveAppOrigin } from "@/lib/url/app-origin";

/**
 * OAuth redirect base — browser uses live origin; server uses resolveAppOrigin (localhost in dev).
 */
export function getOAuthBaseUrl(requestUrl?: string): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return resolveAppOrigin(requestUrl);
}

export function getCallbackUrl(next?: string, requestUrl?: string): string {
  const base = `${getOAuthBaseUrl(requestUrl)}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export function getPasswordResetUrl(requestUrl?: string): string {
  return `${getOAuthBaseUrl(requestUrl)}/auth/callback?type=recovery`;
}

/** If Supabase lands OAuth on `/?code=...`, forward to the real callback handler. */
export function buildAuthCallbackRedirectFromSearchParams(
  searchParams: URLSearchParams,
  requestUrl: string,
): string | null {
  if (!searchParams.has("code")) return null;
  const callback = new URL("/auth/callback", requestUrl);
  searchParams.forEach((value, key) => {
    callback.searchParams.set(key, value);
  });
  return callback.pathname + callback.search;
}
