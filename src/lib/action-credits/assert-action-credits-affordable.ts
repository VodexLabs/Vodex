import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";
import { isFreeRuntimeAction } from "@/lib/action-credits/action-catalog";
import { getActionCreditBalance } from "@/lib/action-credits/charge-action-credit";

export const RUNTIME_ACTION_UNAVAILABLE_MESSAGE =
  "This AI feature is temporarily unavailable. Please try again later.";

export type AssertActionCreditsInput = {
  ownerUserId: string;
  projectId?: string | null;
  actionType: string;
  providerCostUsd?: number | null;
  dynamicFloor?: number | null;
};

export type AssertActionCreditsResult =
  | { ok: true; required: number; balance: number; quote: ReturnType<typeof quoteActionCredits> }
  | {
      ok: false;
      required: number;
      balance: number;
      code: "insufficient";
      quote: ReturnType<typeof quoteActionCredits>;
    };

/** Atomic pre-check — must pass before any paid provider call. */
export async function assertActionCreditsAffordable(
  input: AssertActionCreditsInput,
): Promise<AssertActionCreditsResult> {
  const quote = quoteActionCredits({
    actionType: input.actionType,
    providerCostUsd: input.providerCostUsd,
    dynamicFloor: input.dynamicFloor,
  });

  if (quote.isFree || isFreeRuntimeAction(quote.canonicalType)) {
    const balance = await getActionCreditBalance(input.ownerUserId, input.projectId);
    return { ok: true, required: 0, balance, quote };
  }

  const required = quote.finalActionCredits;
  const balance = await getActionCreditBalance(input.ownerUserId, input.projectId);

  if (balance < required) {
    return { ok: false, required, balance, code: "insufficient", quote };
  }

  return { ok: true, required, balance, quote };
}
