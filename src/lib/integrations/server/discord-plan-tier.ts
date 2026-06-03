import { normalizePlanId } from "@/lib/billing/plans";
import type { DiscordSubscriptionTier } from "@/lib/integrations/server/discord-config";

/** Maps Vodex plan → Discord subscription role tier (Founder/Mod roles are never touched). */
export function vodexPlanToDiscordTier(planId: string | null | undefined): DiscordSubscriptionTier {
  const plan = normalizePlanId(planId ?? "free");
  if (plan === "free") return "builder";
  if (plan === "starter") return "starter";
  if (plan === "pro") return "pro";
  if (plan.startsWith("infinity") || plan === "enterprise") return "infinity";
  return "builder";
}
