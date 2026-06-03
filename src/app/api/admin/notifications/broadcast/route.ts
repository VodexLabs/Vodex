import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type TargetPlan = "all" | "free" | "starter" | "pro" | "infinity";

function planMatches(planId: string | null | undefined, target: TargetPlan): boolean {
  if (target === "all") return true;
  const p = (planId ?? "free").toLowerCase();
  if (target === "free") return p === "free";
  if (target === "starter") return p === "starter";
  if (target === "pro") return p === "pro";
  if (target === "infinity") return p.startsWith("infinity") || p === "enterprise";
  return true;
}

export async function POST(request: Request) {
  const owner = await requireDreamosOwner();
  if (owner.error) return owner.error;

  const body = (await request.json()) as {
    title?: string;
    message?: string;
    category?: string;
    actionLabel?: string;
    actionUrl?: string;
    playSound?: boolean;
    targetEmail?: string;
    targetPlan?: TargetPlan;
    templateId?: string;
    iconKey?: string;
    effectKey?: string;
    design?: {
      backgroundPreset?: string;
      effectPreset?: string;
      iconPreset?: string;
      animatedIconEnabled?: boolean;
      textColor?: string;
      accentColor?: string;
      outlineColor?: string;
    };
  };

  const title = body.title?.trim();
  const message = body.message?.trim();
  if (!title || !message) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  let profiles: Array<{ id: string; plan_id?: string }> = [];

  if (body.targetEmail?.trim()) {
    const { data: profile } = await db
      .from("profiles")
      .select("id, plan_id")
      .eq("email", body.targetEmail.trim().toLowerCase())
      .maybeSingle();
    if (!profile?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    profiles = [profile];
  } else {
    const { data: rows } = await db.from("profiles").select("id, plan_id").limit(10000);
    const targetPlan = (body.targetPlan ?? "all") as TargetPlan;
    profiles = (rows ?? []).filter((p: { id: string; plan_id?: string }) =>
      planMatches(p.plan_id, targetPlan),
    );
  }

  const userIds = profiles.map((p) => p.id);
  if (userIds.length === 0) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }

  const rows = userIds.map((userId: string) => ({
    user_id: userId,
    type: body.category === "credit" ? "credit" : "system",
    title,
    body: message,
    read: false,
    action_url: body.actionUrl ?? null,
    metadata: {
      kind: "admin_message",
      play_sound: body.playSound !== false,
      premium: true,
      template_id: body.templateId ?? "custom",
      icon_key: body.design?.iconPreset ?? body.iconKey ?? "bell",
      effect_key: body.design?.effectPreset ?? body.effectKey ?? "glow",
      background_preset: body.design?.backgroundPreset,
      text_color: body.design?.textColor,
      accent_color: body.design?.accentColor,
      outline_color: body.design?.outlineColor,
      animated_icon: body.design?.animatedIconEnabled,
    },
  }));

  const { error } = await db.from("notifications").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("admin_broadcasts").insert({
    title,
    body: message,
    category: body.category ?? "system",
    action_label: body.actionLabel ?? null,
    action_url: body.actionUrl ?? null,
    play_sound: body.playSound !== false,
    target_scope: body.targetEmail
      ? "single"
      : body.targetPlan && body.targetPlan !== "all"
        ? `plan:${body.targetPlan}`
        : "all_existing",
    target_plan: body.targetPlan ?? null,
    target_email: body.targetEmail?.trim() || null,
    background_preset: body.design?.backgroundPreset ?? null,
    effect_preset: body.design?.effectPreset ?? null,
    icon_preset: body.design?.iconPreset ?? null,
    animated_icon_enabled: body.design?.animatedIconEnabled ?? false,
    text_color: body.design?.textColor ?? null,
    accent_color: body.design?.accentColor ?? null,
    outline_color: body.design?.outlineColor ?? null,
    recipient_count: rows.length,
    created_by: owner.user.id,
  });

  return NextResponse.json({ ok: true, recipientCount: rows.length });
}
