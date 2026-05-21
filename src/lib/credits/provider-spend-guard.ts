import { getChargeTokensProbeCached } from "@/lib/db/charge-probe-cache";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";

export type ProviderSpendGuardResult =
  | { allowed: true; ownerOverride?: boolean }
  | {
      allowed: false;
      code: "charge_tokens_missing";
      message: string;
      hint?: string;
    };

const BLOCK_MESSAGE =
  "AI requests are temporarily paused while billing sync finishes. Please try again shortly.";

/**
 * Blocks provider API spend when charge_tokens is not callable.
 * Owner may proceed only when DREAMOS_OWNER_ALLOW_PROVIDER_WITHOUT_CHARGE=1 (logged).
 */
export async function assertProviderSpendAllowed(
  userEmail: string | null | undefined,
): Promise<ProviderSpendGuardResult> {
  const probe = await getChargeTokensProbeCached();
  if (probe.ok) return { allowed: true };

  const owner = isDreamosOwnerEmail(userEmail);
  const ownerOverride =
    owner && process.env.DREAMOS_OWNER_ALLOW_PROVIDER_WITHOUT_CHARGE === "1";

  if (ownerOverride) {
    console.warn("[credits] owner override — provider call without charge_tokens", {
      issue: probe.issue,
    });
    return { allowed: true, ownerOverride: true };
  }

  return {
    allowed: false,
    code: "charge_tokens_missing",
    message: BLOCK_MESSAGE,
    hint: probe.nextAction ?? probe.userMessage ?? probe.hint ?? undefined,
  };
}
