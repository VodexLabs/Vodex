"use client";

import type { CanonicalCreditsPayload } from "@/lib/credits/canonical-credits";

export const CREDIT_UPDATED_EVENT = "dreamos:credit-updated";

/** Notify listeners that credits changed. Pass payload to avoid refetch loops. */
export function dispatchCreditUpdated(payload?: CanonicalCreditsPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CREDIT_UPDATED_EVENT, { detail: payload ?? null }),
  );
}

/** Subscribe to credit updates. Handler receives payload when available — apply it, do not refetch. */
export function subscribeCreditUpdated(
  handler: (payload: CanonicalCreditsPayload | null) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const wrapped = (event: Event) => {
    const detail = (event as CustomEvent<CanonicalCreditsPayload | null>).detail ?? null;
    handler(detail);
  };
  window.addEventListener(CREDIT_UPDATED_EVENT, wrapped);
  return () => window.removeEventListener(CREDIT_UPDATED_EVENT, wrapped);
}

/** External invalidation (charge/admin) — listeners should refetch once. */
export function dispatchCreditsInvalidated() {
  dispatchCreditUpdated(undefined);
}
