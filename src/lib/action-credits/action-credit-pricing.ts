/** Action Credits — central pricing engine (runtime, separate from Build Credits). */

import {
  floorForRuntimeAction,
  isFreeRuntimeAction,
  resolveRuntimeActionType,
} from "@/lib/action-credits/action-catalog";

export const ACTION_CREDIT_REVENUE_MULTIPLIER = 5;
export const ACTION_CREDITS_PER_USD = 10;
export const ACTION_CREDIT_ROUND_STEP = 0.1;

export type ActionCreditQuoteInput = {
  actionType: string;
  providerCostUsd?: number | null;
  /** Override floor for dynamic actions (speech/video/workflows). */
  dynamicFloor?: number | null;
};

export type ActionCreditQuote = {
  actionType: string;
  canonicalType: string;
  providerCostUsd: number;
  floor: number;
  protectedMinimum: number;
  finalActionCredits: number;
  multiplierAchieved: number;
  isFree: boolean;
};

function roundActionCredits(value: number): number {
  const step = ACTION_CREDIT_ROUND_STEP;
  return Math.ceil(value / step) * step;
}

export function quoteActionCredits(input: ActionCreditQuoteInput): ActionCreditQuote {
  const canonical = resolveRuntimeActionType(input.actionType);
  const floor = input.dynamicFloor ?? floorForRuntimeAction(canonical);
  const isFree = isFreeRuntimeAction(canonical) && floor <= 0;

  if (isFree) {
    return {
      actionType: input.actionType,
      canonicalType: canonical,
      providerCostUsd: 0,
      floor: 0,
      protectedMinimum: 0,
      finalActionCredits: 0,
      multiplierAchieved: 0,
      isFree: true,
    };
  }

  const providerCostUsd = Math.max(0, Number(input.providerCostUsd ?? 0) || 0);
  const protectedMinimum = roundActionCredits(
    providerCostUsd * ACTION_CREDIT_REVENUE_MULTIPLIER * ACTION_CREDITS_PER_USD,
  );
  const finalActionCredits = roundActionCredits(Math.max(floor, protectedMinimum));
  const revenueUsd = finalActionCredits / ACTION_CREDITS_PER_USD;
  const multiplierAchieved =
    providerCostUsd > 0 ? revenueUsd / providerCostUsd : ACTION_CREDIT_REVENUE_MULTIPLIER;

  return {
    actionType: input.actionType,
    canonicalType: canonical,
    providerCostUsd,
    floor,
    protectedMinimum,
    finalActionCredits,
    multiplierAchieved,
    isFree: false,
  };
}

/** @deprecated use quoteActionCredits */
export function minimumActionCreditsForProviderCost(
  actionType: string,
  providerCostUsd?: number | null,
): number {
  return quoteActionCredits({ actionType, providerCostUsd }).finalActionCredits;
}

/** Platform admin OTP / internal notifications — not metered. */
export function isExemptPlatformAction(metadata?: { exempt?: boolean; source?: string }): boolean {
  if (metadata?.exempt) return true;
  if (metadata?.source === "admin_otp") return true;
  if (metadata?.source === "platform_contact_notify") return true;
  return false;
}
