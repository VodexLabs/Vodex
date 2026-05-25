import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getActionCreditBalance } from "@/lib/action-credits/charge-action-credit";

type UsageLogRow = {
  action_type: string;
  action_credits_charged: number;
  created_at: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const balance = await getActionCreditBalance(user.id, projectId);
  const { data: logs } = await admin
    .from("runtime_action_usage_logs" as never)
    .select("action_type, action_credits_charged, created_at")
    .eq("project_id" as never, projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (logs ?? []) as UsageLogRow[];
  const emailsSent = rows.filter((l) => l.action_type === "email_send").length;
  const aiActions = rows.filter((l) => String(l.action_type).startsWith("llm_")).length;

  return NextResponse.json({
    actionCreditsRemaining: balance,
    emailsSent,
    aiActionsUsed: aiActions,
    recent: rows,
  });
}
