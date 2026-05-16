/**
 * Called once when the Next.js server starts, before any requests are handled.
 *
 * On Windows, Node.js cannot verify some intermediate CA certificates that
 * Supabase's CDN uses. This causes every server-side fetch to supabase.co to
 * fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE, breaking auth (PKCE code exchange)
 * and all server-component data fetching in local dev.
 *
 * This is NOT needed on Vercel — its Node.js runtime ships a complete cert
 * bundle. The guard below ensures the bypass never runs in production.
 */
export function register() {
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
