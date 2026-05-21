import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { listAdminUsers } from "@/lib/admin/list-users";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const { users, error } = await listAdminUsers({ q: id, limit: 500 });
  if (error) return NextResponse.json({ error }, { status: 500 });

  const user = users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const admin = createSupabaseAdmin();

  const usagePrimary = await admin
    .from("ai_usage_logs")
    .select("id,created_at,model_id,tokens_charged,status")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(25);

  const usageRes =
    usagePrimary.error?.message?.includes("tokens_charged")
      ? await admin
          .from("ai_usage_logs")
          .select("id,created_at,model_id,credits_charged,status")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(25)
      : usagePrimary;

  const [jobsRes, ledgerRes] = await Promise.all([
    admin
      .from("build_jobs")
      .select("id,created_at,status,project_id")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("token_ledger")
      .select("id,created_at,amount,source,reason")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return NextResponse.json({
    user,
    usage: usageRes.data ?? [],
    buildJobs: jobsRes.data ?? [],
    tokenLedger: ledgerRes.data ?? [],
    ledgerError: ledgerRes.error?.message ?? null,
  });
}

/** Dangerous mutations require email OTP via POST /api/admin/confirmations/verify */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct admin mutations are disabled. Request a confirmation code via POST /api/admin/confirmations/request, then verify via POST /api/admin/confirmations/verify.",
      code: "otp_required",
    },
    { status: 403 },
  );
}
