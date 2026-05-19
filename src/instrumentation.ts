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
const EXPECTED_SUPABASE_PROJECT_REF = "xycqutvqxtkbszytaxbe";

export function register() {
  // Local dev on Windows only: Supabase CDN certs can fail Node verification (UNABLE_TO_VERIFY_LEAF_SIGNATURE).
  // Set here — not in npm scripts — so production never logs the insecure TLS warning. Vercel does not need this.
  if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  // Dev-only: confirm which Supabase project the server resolves (never log keys).
  if (process.env.NODE_ENV === "development") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const matchesExpected = url.includes(EXPECTED_SUPABASE_PROJECT_REF);
    console.info(
      "[DreamOS86][env] NEXT_PUBLIC_SUPABASE_URL=%s | expectedRef=%s | match=%s | NEXT_PUBLIC_APP_URL=%s",
      url || "(unset)",
      EXPECTED_SUPABASE_PROJECT_REF,
      String(matchesExpected),
      process.env.NEXT_PUBLIC_APP_URL ?? "(unset)",
    );
  }
}
