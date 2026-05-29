import type { PlanId } from "@/lib/supabase/types";

const KNOWN_PLANS: PlanId[] = ["free", "starter", "pro", "business", "infinity", "enterprise"];

export function normalizePlanId(plan: string): PlanId {
  if (plan === "business") return "pro";
  if (plan === "enterprise") return "infinity";
  if ((KNOWN_PLANS as string[]).includes(plan)) return plan as PlanId;
  return "free";
}
