import { DREAMOS_REF_COOKIE } from "@/lib/auth/ref-cookie";
import { DREAMOS_RETURN_TO_COOKIE } from "@/lib/auth/oauth-prep";
import {
  detectPkceProjectMismatch,
  getConfiguredSupabaseProjectRef,
} from "@/lib/supabase/supabase-auth-cookies";

export const OPTIONAL_OAUTH_STATE_COOKIES = [
  DREAMOS_REF_COOKIE,
  DREAMOS_RETURN_TO_COOKIE,
] as const;

export function isSupabasePkceVerifierCookie(name: string): boolean {
  return (
    name.includes("code-verifier") ||
    name.includes("code_verifier") ||
    (name.startsWith("sb-") && name.includes("auth") && name.includes("verifier"))
  );
}

export function listCookieNames(cookies: { name: string }[]): string[] {
  return [...new Set(cookies.map((c) => c.name))].sort();
}

export type OAuthCallbackCookieDiagnostics = {
  hasPkceVerifier: boolean;
  hasReferralCookie: boolean;
  hasReturnToCookie: boolean;
  supabaseAuthCookieNames: string[];
  optionalStateCookieNames: string[];
  allCookieNames: string[];
  configuredSupabaseRef: string | null;
  pkceVerifierRefs: string[];
  pkceProjectMismatch: boolean;
};

export function diagnoseOAuthCallbackCookies(
  cookies: { name: string }[],
): OAuthCallbackCookieDiagnostics {
  const allCookieNames = listCookieNames(cookies);
  const pkce = detectPkceProjectMismatch(allCookieNames);
  const configuredRef = getConfiguredSupabaseProjectRef();
  const hasVerifierForConfigured = configuredRef
    ? allCookieNames.some((n) => n === `sb-${configuredRef}-auth-token-code-verifier` || n.startsWith(`sb-${configuredRef}-auth-token-code-verifier.`))
    : allCookieNames.some(isSupabasePkceVerifierCookie);

  return {
    hasPkceVerifier: hasVerifierForConfigured || allCookieNames.some(isSupabasePkceVerifierCookie),
    hasReferralCookie: allCookieNames.includes(DREAMOS_REF_COOKIE),
    hasReturnToCookie: allCookieNames.includes(DREAMOS_RETURN_TO_COOKIE),
    supabaseAuthCookieNames: allCookieNames.filter(
      (n) => n.startsWith("sb-") && n.includes("auth"),
    ),
    optionalStateCookieNames: allCookieNames.filter((n) =>
      (OPTIONAL_OAUTH_STATE_COOKIES as readonly string[]).includes(n),
    ),
    allCookieNames,
    configuredSupabaseRef: pkce.configuredRef,
    pkceVerifierRefs: pkce.verifierRefs,
    pkceProjectMismatch: pkce.mismatch,
  };
}
