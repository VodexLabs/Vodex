import { formatAuthCookieDirective, getAuthCookieOptions } from "@/lib/auth/auth-cookie-options";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";

export const TERMS_VERSION = "2026-05-19";
export const DREAMOS_SIGNUP_CONSENT_COOKIE = "dreamos_signup_consent";
export const DREAMOS_SIGNUP_MARKETING_COOKIE = "dreamos_signup_marketing";

export type SignupConsentPayload = {
  termsAccepted: boolean;
  marketingOptIn: boolean;
};

export function persistSignupConsentForBrowser(payload: SignupConsentPayload): void {
  if (typeof document === "undefined") return;
  const flags = formatAuthCookieDirective(getAuthCookieOptions());
  if (payload.termsAccepted) {
    document.cookie = `${DREAMOS_SIGNUP_CONSENT_COOKIE}=1; ${flags}`;
  }
  document.cookie = `${DREAMOS_SIGNUP_MARKETING_COOKIE}=${payload.marketingOptIn ? "1" : "0"}; ${flags}`;
}

export function readSignupConsentFromCookieHeader(
  cookieHeader: string | null,
): SignupConsentPayload | null {
  if (!cookieHeader) return null;
  let termsAccepted = false;
  let marketingOptIn = false;
  for (const part of cookieHeader.split(";")) {
    const p = part.trim();
    if (p.startsWith(`${DREAMOS_SIGNUP_CONSENT_COOKIE}=`)) termsAccepted = true;
    if (p.startsWith(`${DREAMOS_SIGNUP_MARKETING_COOKIE}=`)) {
      marketingOptIn = p.slice(DREAMOS_SIGNUP_MARKETING_COOKIE.length + 1) === "1";
    }
  }
  if (!termsAccepted) return null;
  return { termsAccepted, marketingOptIn };
}

export async function applySignupConsentToProfile(
  admin: SupabaseAdminClient,
  userId: string,
  payload: SignupConsentPayload,
  clientIp?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("profiles")
    .update({
      terms_accepted_at: now,
      terms_version: TERMS_VERSION,
      terms_accepted_ip: clientIp ?? null,
      marketing_emails_opt_in: payload.marketingOptIn,
    } as never)
    .eq("id", userId);
}
