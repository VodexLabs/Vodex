import "server-only";

import { getServerSessionUser } from "@/lib/auth/session";
import { loadServerCreditsSnapshot } from "@/lib/credits/server-credits-snapshot";
import type { CanonicalCreditsPayload } from "@/lib/credits/canonical-credits";
import { sessionIntroPendingFromCookieHeader } from "@/lib/session/session-intro-cookie";
import { headers } from "next/headers";

export type AuthenticatedShellProps = {
  userId: string;
  initialCredits: CanonicalCreditsPayload | null;
  pendingLoginIntro: boolean;
} | null;

export async function loadAuthenticatedShellProps(): Promise<AuthenticatedShellProps> {
  const user = await getServerSessionUser();
  if (!user) return null;

  const [initialCredits, cookieHeader] = await Promise.all([
    loadServerCreditsSnapshot(user.id),
    headers().then((h) => h.get("cookie")),
  ]);

  return {
    userId: user.id,
    initialCredits,
    pendingLoginIntro: sessionIntroPendingFromCookieHeader(cookieHeader),
  };
}
