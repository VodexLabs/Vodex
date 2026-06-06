import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/billing/plan-entitlements";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient() ?? supabase;
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: published } = await admin
    .from("published_apps" as never)
    .select("watermark_disabled")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: settings } = await admin
    .from("app_watermark_settings" as never)
    .select("watermark_disabled")
    .eq("project_id", projectId)
    .maybeSingle();

  const disabled =
    Boolean((published as { watermark_disabled?: boolean } | null)?.watermark_disabled) ||
    Boolean((settings as { watermark_disabled?: boolean } | null)?.watermark_disabled);

  return NextResponse.json({ watermarkDisabled: disabled });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { watermarkDisabled?: boolean };
  const watermarkDisabled = body.watermarkDisabled === true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .maybeSingle();

  const planId = (profile as { plan_id?: string } | null)?.plan_id ?? "free";
  if (getEntitlements(planId).tier === "free" && watermarkDisabled) {
    return NextResponse.json({ error: "Starter+ required to hide watermark" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin
    .from("app_watermark_settings" as never)
    .upsert(
      {
        project_id: projectId,
        owner_id: user.id,
        watermark_disabled: watermarkDisabled,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "project_id" },
    );

  await admin
    .from("published_apps" as never)
    .update({ watermark_disabled: watermarkDisabled } as never)
    .eq("project_id", projectId);

  return NextResponse.json({ ok: true, watermarkDisabled });
}
