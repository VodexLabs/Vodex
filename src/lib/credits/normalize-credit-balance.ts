import type { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Max spendable = plan allowance + explicit bonus grants only. */
export function creditCap(planAllowance: number, explicitBonus: number): number {
  return Math.round((planAllowance + Math.max(0, explicitBonus)) * 10) / 10;
}

/**
 * Normalize inflated DB balances (legacy SQL quota / plan migration bugs).
 * Never allow available > cap; recompute from ledger usage when possible.
 */
export function normalizeAvailableCredits(input: {
  rawAvailable: number;
  planAllowance: number;
  explicitBonus: number;
  ledgerUsed: number;
}): { available: number; inflated: boolean; correctedFrom: number } {
  const cap = creditCap(input.planAllowance, input.explicitBonus);
  const raw = Math.max(0, input.rawAvailable);

  if (raw <= cap + 0.01) {
    return { available: raw, inflated: false, correctedFrom: raw };
  }

  if (input.ledgerUsed > 0) {
    const fromLedger = Math.max(0, Math.round((cap - input.ledgerUsed) * 10) / 10);
    return { available: fromLedger, inflated: true, correctedFrom: raw };
  }

  return { available: cap, inflated: true, correctedFrom: raw };
}

export async function repairProfileCreditsIfInflated(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  correctedAvailable: number,
): Promise<void> {
  await admin
    .from("profiles")
    .update({ credits_remaining: correctedAvailable })
    .eq("id", userId);
}
