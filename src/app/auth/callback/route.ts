import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase PKCE auth callback — handles ALL auth redirect cases.
 *
 * Supabase sends users here after:
 *   - Email/password sign-up confirmation      → ?code=...
 *   - Google / GitHub OAuth                    → ?code=...
 *   - Password-reset email link                → ?code=...&type=recovery
 *   - Provider rejection / user cancels OAuth  → ?error=access_denied&error_description=...
 *
 * Optional app-set params:
 *   - ?next=/some/path   post-auth redirect destination
 *
 * On any failure the user is sent to /auth/login?error=<slug>
 * so the login view can surface a clean human-readable message.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const type = searchParams.get("type");   // "recovery" for password-reset links
  const next = searchParams.get("next") ?? "/";

  // Provider / user explicitly rejected the OAuth request
  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description");

  if (providerError) {
    const slug =
      providerError === "access_denied"
        ? "access_denied"
        : "server_error";
    const params = new URLSearchParams({ error: slug });
    if (providerErrorDesc) params.set("error_description", providerErrorDesc);
    return NextResponse.redirect(`${origin}/auth/login?${params}`);
  }

  // No code at all — malformed URL
  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  // Exchange the PKCE code for a session
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Differentiate expired/replayed links from other errors
    const msg = exchangeError.message.toLowerCase();
    const isExpired =
      msg.includes("expired") ||
      msg.includes("otp_expired") ||
      msg.includes("already") ||
      msg.includes("token has been used");

    const slug = isExpired ? "session_exchange_failed" : "callback_failed";
    return NextResponse.redirect(`${origin}/auth/login?error=${slug}`);
  }

  // Password-reset flow — user must now set their new password
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Standard sign-in / sign-up / OAuth success
  const destination = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${destination}`);
}
