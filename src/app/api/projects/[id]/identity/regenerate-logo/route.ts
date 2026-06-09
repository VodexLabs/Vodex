import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { regenerateAppLogo } from "@/lib/projects/app-identity-service";
import { quoteLogoRegenerationCredits } from "@/lib/action-credits/logo-generation-pricing";
import { getActionCreditAvailability } from "@/lib/action-credits/get-action-credit-availability";
import { resolveActionCreditBalance } from "@/lib/action-credits/resolve-action-credit-balance";
import { routeImageProvider } from "@/lib/ai/image-provider-routing";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { confirm?: boolean; operationId?: string };
  if (!body.confirm) {
    const route = routeImageProvider("image_simple");
    const quote = quoteLogoRegenerationCredits(route.estimatedCostUsd);
    return NextResponse.json({
      actionCredits: quote.finalActionCredits,
      message: "Confirm to regenerate your app logo.",
    });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, app_name, name, short_description, category, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const operationId = body.operationId?.trim() || `logo-regen:${randomUUID()}`;
  const admin = createSupabaseAdmin();
  const result = await regenerateAppLogo({
    writer: admin,
    userId: user.id,
    projectId,
    operationId,
    appName: project.app_name?.trim() || project.name?.trim() || "App",
    shortDescription: project.short_description?.trim() || "",
    category: project.category ?? undefined,
  });

  if (!result.ok) {
    const status = result.code === "insufficient" ? 402 : 500;
    const quote = quoteLogoRegenerationCredits(routeImageProvider("image_simple").estimatedCostUsd);
    const [resolved, avail] = await Promise.all([
      resolveActionCreditBalance(user.id, { projectId }),
      getActionCreditAvailability(user.id, {
        projectId,
        actionType: "app_logo_regeneration",
        dynamicFloor: quote.finalActionCredits,
      }),
    ]);
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        debug: {
          user_id: user.id,
          project_id: projectId,
          action_credit_balance: resolved.balance,
          required_cost: avail.requiredForAction,
          source: resolved.source,
          plan_allowance: resolved.planAllowance,
        },
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    iconUrl: result.identity.iconUrl,
    charged: result.charged,
    operationId,
  });
}
