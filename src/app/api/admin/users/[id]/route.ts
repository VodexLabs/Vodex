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

  const [jobsRes, ledgerRes, actionGiftRes] = await Promise.all([
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
    admin
      .from("action_credit_events" as never)
      .select("id, created_at, action_type, action_credits_charged, status, metadata, operation_id")
      .eq("owner_user_id" as never, id)
      .in("action_type" as never, ["admin_grant", "admin_set_balance"])
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const creditGifts = [
    ...(ledgerRes.data ?? [])
      .filter((row) => {
        const r = row as { source?: string; amount?: number };
        return (r.amount ?? 0) > 0 && /admin|grant|gift|support/i.test(r.source ?? "");
      })
      .map((row) => {
        const r = row as { id: string; created_at: string; amount: number; source?: string; reason?: string };
        return {
          id: r.id,
          at: r.created_at,
          kind: "build" as const,
          amount: r.amount,
          label: r.source ?? "build_grant",
          reason: r.reason ?? null,
        };
      }),
    ...((actionGiftRes.data ?? []) as Array<{
      id: string;
      created_at: string;
      action_type: string;
      action_credits_charged?: number;
      metadata?: { reason?: string; delta?: number; before?: number; after?: number };
    }>).map((row) => ({
      id: row.id,
      at: row.created_at,
      kind: "action" as const,
      amount:
        row.action_type === "admin_grant"
          ? Math.abs(Number(row.metadata?.delta ?? row.action_credits_charged ?? 0))
          : Number(row.metadata?.after ?? 0),
      label: row.action_type,
      reason: row.metadata?.reason ?? null,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({
    user,
    usage: usageRes.data ?? [],
    buildJobs: jobsRes.data ?? [],
    tokenLedger: ledgerRes.data ?? [],
    actionCreditGifts: actionGiftRes.data ?? [],
    creditGifts,
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
