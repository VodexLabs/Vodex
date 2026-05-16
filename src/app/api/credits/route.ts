import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("credits_remaining, credits_reset_at, plan_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get usage this period from credit ledger
  const { data: usage } = await supabase
    .from("credit_events")
    .select("credits_consumed")
    .eq("user_id", user.id)
    .eq("event_type", "generation")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const total_used = usage?.reduce((sum, e) => sum + e.credits_consumed, 0) ?? 0;

  return NextResponse.json({
    remaining: profile.credits_remaining,
    reset_at: profile.credits_reset_at,
    plan_id: profile.plan_id,
    total_used,
  });
}
