/**
 * Canonical plan-change resolver — subscription-aware.
 * All billing UIs and APIs must use resolveUnifiedBillingAction().
 */
import {
  billablePlanToPlanId,
  type BillablePlanId,
  type CatalogBillingInterval,
} from "@/lib/billing/plan-billing-catalog";
import {
  resolvePlanChange,
  type PlanChangeBillingIntent,
  type ResolvedPlanChange,
} from "@/lib/billing/plan-change-router";
import type { PlanId } from "@/lib/supabase/types";

export type UnifiedBillingAction =
  | "checkout"
  | "upgrade"
  | "downgrade"
  | "switch_interval"
  | "same_plan"
  | "blocked";

export type UnifiedBillingApiRoute =
  | "/api/billing/paddle/checkout"
  | "/api/billing/paddle/upgrade"
  | "/api/billing/paddle/change-plan"
  | null;

export type UnifiedBillingResolution = ResolvedPlanChange & {
  /** Executable billing action after subscription rules. */
  unifiedAction: UnifiedBillingAction;
  /** Preferred API route for clients that call endpoints directly. */
  apiRoute: UnifiedBillingApiRoute;
  hasActiveSubscription: boolean;
  targetStoragePlanId: PlanId;
};

export function resolveUnifiedBillingAction(input: {
  currentPlanId: string;
  currentInterval?: CatalogBillingInterval | null;
  targetPlan: BillablePlanId;
  targetInterval: CatalogBillingInterval;
  paddleSubscriptionId: string | null;
}): UnifiedBillingResolution {
  const base = resolvePlanChange({
    currentPlanId: input.currentPlanId,
    currentInterval: input.currentInterval ?? null,
    targetPlan: input.targetPlan,
    targetInterval: input.targetInterval,
  });

  const hasSub = Boolean(input.paddleSubscriptionId?.trim());
  const unifiedAction = mapToUnifiedAction(base, hasSub);
  const apiRoute = apiRouteForAction(unifiedAction);

  return {
    ...base,
    unifiedAction,
    apiRoute,
    hasActiveSubscription: hasSub,
    targetStoragePlanId: billablePlanToPlanId(input.targetPlan),
  };
}

function mapToUnifiedAction(
  change: ResolvedPlanChange,
  hasActiveSubscription: boolean,
): UnifiedBillingAction {
  switch (change.action) {
    case "same_plan":
      return "same_plan";
    case "highest_plan":
      return "blocked";
    case "schedule_downgrade":
      return hasActiveSubscription ? "downgrade" : "blocked";
    case "portal":
      if (change.billingIntent === "interval_change" && hasActiveSubscription) {
        return "switch_interval";
      }
      return "blocked";
    case "checkout":
      if (hasActiveSubscription && change.billingIntent === "upgrade") {
        return "upgrade";
      }
      if (hasActiveSubscription && change.billingIntent === "new_subscription") {
        return "upgrade";
      }
      return "checkout";
    default:
      return "blocked";
  }
}

function apiRouteForAction(action: UnifiedBillingAction): UnifiedBillingApiRoute {
  switch (action) {
    case "checkout":
      return "/api/billing/paddle/checkout";
    case "upgrade":
      return "/api/billing/paddle/upgrade";
    case "downgrade":
    case "switch_interval":
      return "/api/billing/paddle/change-plan";
    default:
      return null;
  }
}

export function unifiedActionAllowsExecution(action: UnifiedBillingAction): boolean {
  return (
    action === "checkout" ||
    action === "upgrade" ||
    action === "downgrade" ||
    action === "switch_interval"
  );
}

export function paddleBillingIntentForUnified(
  resolution: UnifiedBillingResolution,
): PlanChangeBillingIntent {
  if (resolution.unifiedAction === "switch_interval") return "interval_change";
  if (resolution.unifiedAction === "downgrade") return "downgrade";
  if (resolution.unifiedAction === "upgrade") return "upgrade";
  return resolution.billingIntent;
}
