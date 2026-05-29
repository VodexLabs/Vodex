import type { GenerationCostQuote } from "@/lib/billing/credit-profit-guard";

export type BuildCreditTerminalState =
  | "completed"
  | "partial_needs_more_credits"
  | "failed_refunded"
  | "blocked_zero_credits";

export type BuildCreditAllowance = {
  allowed: boolean;
  blocked: boolean;
  partial: boolean;
  /** Credits to reserve/debit upfront (never exceeds balance). */
  reserveAmount: number;
  /** Full quote before capping to balance. */
  quotedReserve: number;
  quotedRequired: number;
  balance: number;
  code?: "blocked_zero_credits" | "insufficient_tokens";
};

/**
 * Build credits: allow start when balance > 0; reserve min(quoted, balance).
 * Discuss/edit still require full estimate (handled by caller).
 */
export function resolveBuildCreditAllowance(
  balance: number,
  quote: GenerationCostQuote,
): BuildCreditAllowance {
  const available = Math.max(0, Math.floor(balance));
  const quotedReserve = Math.max(0, Math.ceil(quote.userCreditsReserved));
  const quotedRequired = Math.max(0, Math.ceil(quote.userCreditsRequired));

  if (available <= 0) {
    return {
      allowed: false,
      blocked: true,
      partial: false,
      reserveAmount: 0,
      quotedReserve,
      quotedRequired,
      balance: available,
      code: "blocked_zero_credits",
    };
  }

  const reserveAmount = Math.max(1, Math.min(available, quotedReserve));
  const partial = reserveAmount < quotedReserve;

  return {
    allowed: true,
    blocked: false,
    partial,
    reserveAmount,
    quotedReserve,
    quotedRequired,
    balance: available,
  };
}

export function userFacingBuildCreditBlockMessage(allowance: BuildCreditAllowance): string {
  if (allowance.code === "blocked_zero_credits") {
    return "Your Build Credits are used up. Add credits or upgrade to keep building.";
  }
  return "Add Build Credits to continue.";
}

export function userFacingPartialBuildStartMessage(creditsAvailable: number): string {
  const n = Math.max(1, Math.floor(creditsAvailable));
  return `You have ${n} Build Credit${n === 1 ? "" : "s"} left. I can start and save as much progress as those credits allow.`;
}

export function userFacingPartialStopMessage(creditsUsed: number): string {
  const n = Math.max(1, Math.floor(creditsUsed));
  return `I used your remaining ${n} Build Credit${n === 1 ? "" : "s"} and saved the progress. The next steps are ready when you continue.`;
}

/** Action credits: block if balance cannot cover a single atomic operation. */
export function canAffordAtomicAction(balance: number, minimumCost: number): boolean {
  return Math.floor(balance) >= Math.max(1, Math.ceil(minimumCost));
}

/** Rough per workflow-event credit weight for staged partial builds. */
export function workflowEventCreditStageCost(type: string): number {
  switch (type) {
    case "planning":
    case "designing":
    case "schema":
      return 1;
    case "identity":
    case "icon":
      return 1;
    case "writing":
    case "editing":
      return 1.5;
    case "validating":
    case "repairing":
    case "compiling":
      return 1;
    default:
      return 0.5;
  }
}
