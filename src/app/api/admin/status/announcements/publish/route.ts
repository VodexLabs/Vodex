import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getBannerTemplate } from "@/lib/status/announcement-templates";
import { isStatusSchemaMissingError, STATUS_SCHEMA_INSTALL_HINT } from "@/lib/status/status-db";
import { sanitizeAdminUrl } from "@/lib/control-center/sanitize-url";

type TargetPlan = "all" | "free" | "starter" | "pro" | "infinity";

export async function POST(request: Request) {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  const body = (await request.json()) as {
    title?: string;
    message?: string;
    severity?: string;
    bannerType?: string;
    linkLabel?: string;
    linkUrl?: string;
    template?: string;
    priority?: number;
    gradientFrom?: string;
    gradientTo?: string;
    textColor?: string;
    iconType?: string;
    deactivateOthers?: boolean;
    targetEmail?: string;
    targetPlan?: TargetPlan;
    design?: {
      backgroundPreset?: string;
      effectPreset?: string;
      iconPreset?: string;
      animatedIconEnabled?: boolean;
      textColor?: string;
      accentColor?: string;
      outlineColor?: string;
      buttonColor?: string;
    };
  };

  const tpl = body.template ? getBannerTemplate(body.template) : null;
  const title = body.title?.trim() || tpl?.title;
  const message = body.message?.trim() || tpl?.message;
  if (!title || !message) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  const safeLink = sanitizeAdminUrl(body.linkUrl ?? tpl?.linkUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { count } = await db
    .from("platform_announcements")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if ((count ?? 0) >= 2 && !body.deactivateOthers) {
    return NextResponse.json({ error: "Max 2 active announcements. Deactivate one first." }, { status: 400 });
  }

  if (body.deactivateOthers) {
    await db.from("platform_announcements").update({ is_active: false }).eq("is_active", true);
  }

  let targetUserId: string | null = null;
  if (body.targetEmail?.trim()) {
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("email", body.targetEmail.trim().toLowerCase())
      .maybeSingle();
    if (!profile?.id) {
      return NextResponse.json({ error: "User not found for email" }, { status: 404 });
    }
    targetUserId = profile.id;
  }

  const { data, error } = await db
    .from("platform_announcements")
    .insert({
      title,
      message,
      severity: body.severity ?? tpl?.severity ?? "info",
      banner_type: body.bannerType ?? tpl?.bannerType ?? "info",
      link_label: body.linkLabel ?? tpl?.linkLabel ?? null,
      link_url: safeLink,
      gradient_from: body.gradientFrom ?? tpl?.gradientFrom ?? null,
      gradient_to: body.gradientTo ?? tpl?.gradientTo ?? null,
      text_color: body.design?.textColor ?? body.textColor ?? tpl?.textColor ?? "#ffffff",
      icon_type: body.design?.iconPreset ?? body.iconType ?? tpl?.iconType ?? "alert",
      effect_key: body.design?.effectPreset ?? "none",
      background_preset: body.design?.backgroundPreset ?? null,
      effect_preset: body.design?.effectPreset ?? null,
      icon_preset: body.design?.iconPreset ?? null,
      animated_icon_enabled: body.design?.animatedIconEnabled ?? false,
      accent_color: body.design?.accentColor ?? null,
      outline_color: body.design?.outlineColor ?? null,
      button_color: body.design?.buttonColor ?? null,
      target_scope: body.targetEmail ? "email" : body.targetPlan ?? "all",
      target_plan: body.targetEmail ? null : body.targetPlan ?? "all",
      target_email: body.targetEmail?.trim() || null,
      target_user_id: targetUserId,
      priority: body.priority ?? tpl?.priority ?? 100,
      is_active: true,
      starts_at: new Date().toISOString(),
      created_by: owner.user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (isStatusSchemaMissingError(error)) {
      return NextResponse.json({ error: STATUS_SCHEMA_INSTALL_HINT }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
