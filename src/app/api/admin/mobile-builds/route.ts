import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isDreamosOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Admin unavailable" }, { status: 503 });

  const { data: jobs, error } = await admin
    .from("mobile_build_jobs" as never)
    .select(
      "id, project_id, owner_id, platform, wrapper_type, status, artifact_type, action_credits_charged, provider_cost_usd, error_message, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (jobs ?? []).map(async (j) => {
      const row = j as Record<string, unknown> & {
        project_id: string;
        owner_id: string;
        action_credits_charged?: number;
        provider_cost_usd?: number;
      };
      const { data: project } = await admin
        .from("projects")
        .select("name")
        .eq("id", row.project_id)
        .maybeSingle();
      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", row.owner_id)
        .maybeSingle();
      const credits = Number(row.action_credits_charged ?? 0);
      const cost = Number(row.provider_cost_usd ?? 0);
      const margin = cost > 0 ? credits / 10 / cost : null;
      return {
        ...(row as Record<string, unknown>),
        project_name: project?.name ?? "—",
        owner_email: profile?.email ?? "—",
        margin,
      };
    }),
  );

  return NextResponse.json({ jobs: enriched });
}
