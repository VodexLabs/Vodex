import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import { FREE_MONTHLY_QUOTA, getMonthlyTokenQuotaForPlan } from "@/lib/stores/credits-store";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { row: profile, hint } = await loadProfileBillingRow(supabase, user);
  if (!profile) {
    return NextResponse.json(
      {
        error: "Profile not available",
        hint:
          hint ??
          "Apply Supabase migrations for public.profiles and ensure SUPABASE_SERVICE_ROLE_KEY is set.",
      },
      { status: 503 },
    );
  }

  const { data: usage } = await supabase
    .from("credit_events")
    .select("credits_consumed")
    .eq("user_id", user.id)
    .eq("event_type", "generation")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const total_used = usage?.reduce((sum, e) => sum + e.credits_consumed, 0) ?? 0;

  const planId = profile.plan_id ?? "free";
  const quota = getMonthlyTokenQuotaForPlan(planId);
  let remaining = profile.credits_remaining;
  if (planId === "free") {
    remaining = Math.min(remaining, FREE_MONTHLY_QUOTA);
  }

  return NextResponse.json({
    remaining,
    quota,
    reset_at: profile.credits_reset_at,
    plan_id: profile.plan_id,
    total_used,
  });
}
