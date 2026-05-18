import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase PKCE auth callback — handles ALL auth redirect cases.
 *
 * After successful sign-in, ensures a profile row exists for the user
 * (guards against cases where the DB trigger didn't fire).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" for password-reset links
  const next = searchParams.get("next") ?? "/";

  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description");

  if (providerError) {
    const slug = providerError === "access_denied" ? "access_denied" : "server_error";
    const params = new URLSearchParams({ error: slug });
    if (providerErrorDesc) params.set("error_description", providerErrorDesc);
    return NextResponse.redirect(`${origin}/auth/login?${params}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const msg = exchangeError.message.toLowerCase();
    const isExpired =
      msg.includes("expired") ||
      msg.includes("otp_expired") ||
      msg.includes("already") ||
      msg.includes("token has been used");
    const slug = isExpired ? "session_exchange_failed" : "callback_failed";
    return NextResponse.redirect(`${origin}/auth/login?error=${slug}`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Ensure profile exists after successful auth (idempotent upsert)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata ?? {};
      const rawName: string = meta.full_name ?? meta.name ?? "";
      const emailPrefix = (user.email ?? "").split("@")[0];

      // Clean and capitalize the display name
      function toDisplayName(s: string): string {
        if (!s) return emailPrefix.replace(/[^a-zA-Z0-9\s]/g, "").trim();
        return s
          .split(/[\s_\-\.]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
          .trim();
      }

      function toUsername(s: string): string {
        return s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "user";
      }

      const displayName = toDisplayName(rawName) || toDisplayName(emailPrefix);
      const username = toUsername(emailPrefix);

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, full_name, username, credits_remaining, plan_id")
        .eq("id", user.id)
        .single();

      const resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (!existing) {
        // Profile doesn't exist — create it (trigger may have failed).
        // Use type cast to bypass strict Supabase insert typing for partial insert.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any).insert({
          id: user.id,
          email: user.email ?? "",
          full_name: displayName,
          username,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          plan_id: "free",
          credits_remaining: 100,
          credits_reset_at: resetAt,
        });
      } else {
        // Fill in any missing fields without overwriting existing data
        if (!existing.full_name && displayName) {
          await supabase.from("profiles").update({ full_name: displayName }).eq("id", user.id);
        }
        if (!existing.username && username) {
          await supabase.from("profiles").update({ username }).eq("id", user.id);
        }
        if (existing.credits_remaining === null || existing.credits_remaining === undefined) {
          await supabase.from("profiles").update({
            credits_remaining: 100,
            credits_reset_at: resetAt,
          }).eq("id", user.id);
        }
        if (!existing.plan_id) {
          await supabase.from("profiles").update({ plan_id: "free" as const }).eq("id", user.id);
        }
      }
    }
  } catch {
    // Profile bootstrap failed — don't block auth redirect
  }

  const destination = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${destination}`);
}
