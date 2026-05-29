import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadMobileRevenueCatPublicConfig } from "@/lib/mobile-billing/wrapper-config";
import {
  scanAndroidReadiness,
  scanGeneralReadiness,
  scanIosReadiness,
  scanStoreReadiness,
} from "@/lib/mobile/readiness";
import { MOBILE_SECRET_KEYS } from "@/lib/mobile/secrets";
import { quoteMobileAction } from "@/lib/mobile/action-pricing";

const bodySchema = z.object({
  platforms: z.array(z.enum(["general", "android", "ios", "store"])).optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: checks } = await supabase
    .from("mobile_readiness_checks" as never)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(8);

  return NextResponse.json({ checks: checks ?? [], quote: quoteMobileAction("mobile_readiness_scan") });
}

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

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const platforms = parsed.success ? (parsed.data.platforms ?? ["general", "android", "ios", "store"]) : ["general", "android", "ios", "store"];

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_name, short_description, preview_url, icon_url, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: config } = await supabase
    .from("mobile_app_configs" as never)
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const { count: fileCount } = await supabase
    .from("app_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: files } = await supabase
    .from("app_files")
    .select("path, content")
    .eq("project_id", projectId)
    .limit(300);

  const { data: secrets } = await supabase
    .from("project_secrets")
    .select("key_name")
    .eq("project_id", projectId);

  const secretNames = new Set((secrets ?? []).map((s) => s.key_name as string));
  const cfg = (config ?? {}) as Record<string, unknown>;
  const rcPublic = await loadMobileRevenueCatPublicConfig(projectId);
  const revenueCatConfigured = rcPublic.enabled;

  const results = [];
  if (platforms.includes("general")) {
    results.push(
      scanGeneralReadiness({
        fileCount: fileCount ?? 0,
        hasPreview: Boolean(project.preview_url),
        appName: (project as { app_name?: string }).app_name ?? project.name,
        description: (project as { short_description?: string }).short_description ?? null,
        files: files ?? [],
      }),
    );
  }
  if (platforms.includes("android")) {
    results.push(
      scanAndroidReadiness(cfg as never, {
        hasSigningSecret: secretNames.has(MOBILE_SECRET_KEYS.android_upload_key),
        hasPlayServiceAccount: secretNames.has(MOBILE_SECRET_KEYS.google_play_service_account),
        hasFirebase: secretNames.has(MOBILE_SECRET_KEYS.firebase_google_services),
        fileCount: fileCount ?? 0,
        previewUrl: project.preview_url,
        revenueCatConfigured,
      }),
    );
  }
  if (platforms.includes("ios")) {
    results.push(
      scanIosReadiness(cfg as never, {
        hasAscApiKey: secretNames.has(MOBILE_SECRET_KEYS.asc_api_private_key),
        hasApnsKey: secretNames.has(MOBILE_SECRET_KEYS.apns_key),
        hasSigningAssets: secretNames.has(MOBILE_SECRET_KEYS.android_signing_keystore),
        revenueCatConfigured,
      }),
    );
  }
  if (platforms.includes("store")) {
    results.push(scanStoreReadiness(cfg as never, "android"));
    results.push(scanStoreReadiness(cfg as never, "ios"));
  }

  const quote = quoteMobileAction("mobile_readiness_scan");
  const rows: unknown[] = [];
  for (const r of results) {
    const { data: row, error } = await supabase
      .from("mobile_readiness_checks" as never)
      .insert({
        project_id: projectId,
        owner_id: user.id,
        platform: r.platform,
        score: r.score,
        items: r.items,
        action_credits_charged: 0,
        meta: { deterministic: true },
      } as never)
      .select("*")
      .single();
    if (!error && row) rows.push(row);
  }

  const androidScore = results.find((r) => r.platform === "android")?.score ?? null;
  const iosScore = results.find((r) => r.platform === "ios")?.score ?? null;
  const storeScore = Math.round(
    (results.filter((r) => r.platform === "store").reduce((s, r) => s + r.score, 0) /
      Math.max(1, results.filter((r) => r.platform === "store").length)) ||
      0,
  );

  if (config) {
    await supabase
      .from("mobile_app_configs" as never)
      .update({
        readiness_android: androidScore,
        readiness_ios: iosScore,
        readiness_store: storeScore,
      } as never)
      .eq("project_id", projectId);
  }

  return NextResponse.json({
    results,
    checks: rows,
    scores: { android: androidScore, ios: iosScore, store: storeScore },
    actionCreditsCharged: 0,
    quote,
  });
}
