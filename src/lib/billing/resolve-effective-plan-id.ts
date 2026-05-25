import { normalizePlanId } from "@/lib/billing/plans";

/** Profile plan wins over credits-store default ("free") before canonical sync. */
export function resolveEffectivePlanId(input: {
  profilePlanId?: string | null;
  storePlanId?: string | null;
  isCreditsConfirmed?: boolean;
}): string {
  if (input.profilePlanId?.trim()) {
    return normalizePlanId(input.profilePlanId);
  }
  if (input.isCreditsConfirmed && input.storePlanId?.trim()) {
    return normalizePlanId(input.storePlanId);
  }
  if (input.storePlanId?.trim() && input.storePlanId !== "free") {
    return normalizePlanId(input.storePlanId);
  }
  return "free";
}
