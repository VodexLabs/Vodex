import { extractSupabaseProjectRefFromUrl } from "@/lib/supabase/supabase-project-config";

export function getConfiguredSupabaseProjectRef(): string | null {
  return extractSupabaseProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Cookie name prefix for PKCE verifier: sb-<ref>-auth-token-code-verifier */
export function pkceVerifierCookieName(projectRef: string): string {
  return `sb-${projectRef}-auth-token-code-verifier`;
}

function parseSupabaseCookieProjectRef(cookieName: string): string | null {
  const m = cookieName.match(/^sb-([a-z0-9]+)-auth-token/i);
  return m?.[1] ?? null;
}

/**
 * Remove Supabase auth cookies from other projects (e.g. after switching .env.local).
 * Prevents PKCE "verifier not found" when the browser still holds sb-OLDREF-* cookies.
 */
export function clearStaleSupabaseAuthCookies(activeRef?: string | null): number {
  if (typeof document === "undefined") return 0;

  const ref = activeRef ?? getConfiguredSupabaseProjectRef();
  if (!ref) return 0;

  let cleared = 0;
  const names = document.cookie
    .split(";")
    .map((p) => p.trim().split("=")[0]?.trim())
    .filter((n): n is string => Boolean(n));

  for (const name of names) {
    if (!name.startsWith("sb-")) continue;
    const cookieRef = parseSupabaseCookieProjectRef(name);
    if (!cookieRef || cookieRef === ref) continue;

    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    cleared += 1;

    for (let i = 0; i < 8; i += 1) {
      const chunk = `${name}.${i}`;
      if (document.cookie.includes(chunk)) {
        document.cookie = `${chunk}=; Path=/; Max-Age=0; SameSite=Lax`;
        cleared += 1;
      }
    }
  }

  if (cleared > 0 && process.env.NODE_ENV !== "production") {
    console.info("[DreamOS86][auth] cleared stale Supabase cookies", {
      activeRef: ref,
      cleared,
    });
  }

  return cleared;
}

export function findPkceVerifierCookieRefs(cookieNames: string[]): string[] {
  const refs = new Set<string>();
  for (const name of cookieNames) {
    if (!name.includes("code-verifier") && !name.includes("code_verifier")) continue;
    const ref = parseSupabaseCookieProjectRef(name);
    if (ref) refs.add(ref);
  }
  return [...refs];
}

export function detectPkceProjectMismatch(cookieNames: string[]): {
  configuredRef: string | null;
  verifierRefs: string[];
  mismatch: boolean;
} {
  const configuredRef = getConfiguredSupabaseProjectRef();
  const verifierRefs = findPkceVerifierCookieRefs(cookieNames);
  const mismatch = Boolean(
    configuredRef &&
      verifierRefs.length > 0 &&
      !verifierRefs.includes(configuredRef),
  );
  return { configuredRef, verifierRefs, mismatch };
}
