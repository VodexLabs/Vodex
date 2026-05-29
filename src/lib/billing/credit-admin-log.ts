import type { BuildCreditOperationType } from "@/lib/billing/build-credit-floors";

export type CreditEconomicsAdminLog = {
  provider_cost_usd: number;
  internal_cost_credits: number;
  user_credits_reserved?: number | null;
  user_credits_charged?: number | null;
  operation_type: BuildCreditOperationType | string;
  model_used: string;
  markup_multiplier: number;
  minimum_floor_applied: boolean;
  operation_id?: string;
  mode?: string;
  generation_id?: string;
};

/**
 * Admin-only economics line — never show to normal users in UI.
 */
export function logCreditEconomicsAdmin(
  phase: "reserve" | "charge" | "quote",
  payload: CreditEconomicsAdminLog,
): void {
  console.info(`[credits] ${phase} economics (admin)`, payload);
}
