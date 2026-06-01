/**
 * Vodex — App & site URLs
 *
 * Prefer relative paths (`/create`, `/auth/login`) for in-app navigation.
 * Use these helpers only when an absolute URL is required (OAuth, Stripe, OG, email).
 */

import {
  resolveAppOrigin,
  resolveMetadataBaseOrigin,
  resolveSiteOrigin,
} from "@/lib/url/app-origin";

/** Runtime base URL for the current deployment (OAuth, callbacks, API icon URLs). */
export function getAppUrl(requestUrl?: string): string {
  return resolveAppOrigin(requestUrl);
}

/** Public site origin for metadata, referrals, and shared links. */
export function getSiteUrl(requestUrl?: string): string {
  return resolveSiteOrigin(requestUrl);
}

/** Root layout metadataBase origin — localhost in dev even if marketing env is production. */
export function getMetadataBaseUrl(requestUrl?: string): string {
  return resolveMetadataBaseOrigin(requestUrl);
}

/** Client-safe public site URL (live origin on localhost tab). */
export function getPublicSiteUrl(): string {
  return resolveSiteOrigin();
}

/** Build an absolute URL from a path (runtime app base). Prefer relative paths in UI. */
export function appUrl(path: string, requestUrl?: string): string {
  const base = getAppUrl(requestUrl);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build an absolute URL on the canonical public site. */
export function siteUrl(path: string, requestUrl?: string): string {
  const base = getSiteUrl(requestUrl);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
