"use client";

import * as React from "react";
import type { CanonicalCreditsPayload } from "@/lib/credits/canonical-credits";
import { saveCreditsLocalCache } from "@/lib/credits/credits-local-cache";
import { beginSessionCreditsWarmup } from "@/lib/credits/session-credits-warmup";
import { useCreditsStore } from "@/lib/stores/credits-store";

/**
 * Applies server-fetched canonical credits before first paint (0ms display).
 */
export function CreditsServerHydrator({
  userId,
  initialCredits,
}: {
  userId: string;
  initialCredits: CanonicalCreditsPayload | null;
}) {
  const applied = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!userId || applied.current) return;
    applied.current = true;

    if (initialCredits) {
      useCreditsStore.getState().applyCanonical(initialCredits);
      saveCreditsLocalCache(userId, initialCredits);
      try {
        sessionStorage.setItem("vodex:last-user-id", userId);
      } catch {
        /* ignore */
      }
    }

    beginSessionCreditsWarmup(userId, null);
  }, [userId, initialCredits]);

  return null;
}
