import { normalizePlanId } from "@/lib/billing/plans";

export function isPaidPlan(planId: string | null | undefined): boolean {
  return normalizePlanId(planId ?? "free") !== "free";
}

/** Manual code editing — paid plans; local dev override for owners. */
export function canManualCodeEdit(planId: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return isPaidPlan(planId);
}

/** Generated app integrations — paid plans; local dev override. */
export function canUseIntegrations(planId: string | null | undefined): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return isPaidPlan(planId);
}
