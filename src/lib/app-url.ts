/**
 * DreamOS86 — App & site URLs
 *
 * `getAppUrl()` — Runtime base URL for the *current* deployment (OAuth redirects,
 * auth callbacks). In the browser, prefers `NEXT_PUBLIC_APP_URL` when set, else
 * `window.location.origin`.
 *
 * `getSiteUrl()` — Canonical public marketing URL (Open Graph, referral links,
 * “copy link” when developing on localhost). Prefer `NEXT_PUBLIC_SITE_URL=https://dreamos86.com`
 * in `.env.local` so local dev still shows production URLs in shares and invites.
 */

export function getAppUrl(): string {
  if (typeof process !== "undefined") {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const vercelFallback = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelFallback) return `https://${vercelFallback}`;
  return "https://dreamos86.com";
}

/** Public site origin for metadata, referrals, and shared links (not auth redirects). */
export function getSiteUrl(): string {
  const site = typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : "";
  if (site) return site;

  const app =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "";
  if (app && !/localhost|127\.0\.0\.1/i.test(app)) return app;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "https://dreamos86.com";
}

/** Client-safe canonical URL (uses inlined NEXT_PUBLIC_*). */
export function getPublicSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
      return window.location.origin;
    }
  }
  return "https://dreamos86.com";
}

/** Build an absolute URL from a path (runtime app base). */
export function appUrl(path: string): string {
  const base = getAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build an absolute URL on the canonical public site. */
export function siteUrl(path: string): string {
  const base = getSiteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
