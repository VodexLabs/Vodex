import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasMobileEntitlement } from "@/lib/mobile/entitlements";
import { quoteMobileAction } from "@/lib/mobile/action-pricing";
import {
  generateCapacitorWrapperProject,
  generateTwaManifest,
} from "@/lib/mobile/capacitor-generator";
import { sanitizeMobileBuildLog } from "@/lib/mobile/secrets";
import { validateAndroidPackageId } from "@/lib/mobile/package-validation";
import {
  buildDreamosBillingJson,
  loadMobileRevenueCatPublicConfig,
} from "@/lib/mobile-billing/wrapper-config";

export const runtime = "nodejs";

const postSchema = z.object({
  platform: z.enum(["android", "ios"]),
  artifactType: z.enum(["apk", "aab", "wrapper_zip"]).default("wrapper_zip"),
  wrapperType: z.enum(["capacitor", "twa"]).optional(),
  approved: z.boolean().optional(),
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

  const { data: jobs } = await supabase
    .from("mobile_build_jobs" as never)
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ jobs: jobs ?? [] });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { platform, artifactType, approved } = parsed.data;
  const wrapperType = parsed.data.wrapperType ?? "capacitor";

  const { data: prof } = await supabase.from("profiles").select("plan_id").eq("id", user.id).maybeSingle();
  const planId = prof?.plan_id ?? "free";

  const entitlement =
    platform === "android" ? "mobile_android_build" : "mobile_ios_build";
  if (!hasMobileEntitlement(planId, entitlement)) {
    return NextResponse.json(
      { error: "Upgrade your plan to build mobile apps.", locked: true, code: "plan_gate" },
      { status: 403 },
    );
  }

  const actionKey = platform === "android" ? "android_build" : "ios_build";
  const wrapperQuote = quoteMobileAction("mobile_wrapper_zip_local");
  const buildQuote =
    artifactType === "wrapper_zip" ? wrapperQuote : quoteMobileAction(actionKey);

  if (!approved && buildQuote.requiresApproval) {
    return NextResponse.json({
      requiresApproval: true,
      quote: buildQuote,
      message: "Review Action Credits before starting this build.",
    });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, preview_url, published_subdomain")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: config } = await supabase
    .from("mobile_app_configs" as never)
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const cfg = (config ?? {}) as Record<string, unknown>;
  if (platform === "android") {
    const pkg = validateAndroidPackageId(cfg.package_id as string);
    if (!pkg.valid) {
      return NextResponse.json({ error: pkg.message, code: "invalid_package" }, { status: 400 });
    }
  }

  const writer = admin ?? supabase;
  const { data: files } = await writer
    .from("app_files")
    .select("path, content")
    .eq("project_id", projectId)
    .limit(500);

  if (!files?.length) {
    return NextResponse.json(
      { error: "Generate your app first — no source files found.", code: "no_files" },
      { status: 400 },
    );
  }

  const webUrl =
    project.preview_url ??
    (project.published_subdomain ? `https://${project.published_subdomain}` : null) ??
    "https://your-app.dreamos86.app";

  const rcPublic = await loadMobileRevenueCatPublicConfig(projectId);
  const billingConfigJson = buildDreamosBillingJson(rcPublic);

  const wrapperFiles =
    wrapperType === "twa"
      ? generateTwaManifest({ config: cfg as never, webUrl })
      : generateCapacitorWrapperProject({
          config: cfg as never,
          webUrl,
          appFiles: files,
          billingConfigJson,
        });

  const zip = new JSZip();
  for (const f of wrapperFiles) zip.file(f.path, f.content);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const storagePath = `${user.id}/mobile/${projectId}/${Date.now().toString(36)}-wrapper.zip`;

  const { error: upErr } = await supabase.storage.from("media").upload(storagePath, buffer, {
    contentType: "application/zip",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from("media").createSignedUrl(storagePath, 60 * 60 * 24);
  const artifactUrl = signed?.signedUrl ?? null;

  const wantsBinary = artifactType === "apk" || artifactType === "aab";
  const webhookConfigured = Boolean(process.env.WRAP_ANDROID_WEBHOOK_URL?.trim());
  const status = wantsBinary
    ? webhookConfigured
      ? "queued"
      : "requires_builder_config"
    : "success";

  const logs = sanitizeMobileBuildLog(
    wantsBinary
      ? webhookConfigured
        ? "Wrapper project generated. Remote builder queued."
        : "Wrapper project ZIP ready. APK/AAB requires a connected build worker (WRAP_ANDROID_WEBHOOK_URL) or local Gradle build from the wrapper project."
      : "Capacitor wrapper project generated successfully.",
  );

  const actionCreditsCharged =
    artifactType === "wrapper_zip" ? 0 : buildQuote.isFree ? 0 : buildQuote.actionCredits;

  const { data: job, error: jobErr } = await supabase
    .from("mobile_build_jobs" as never)
    .insert({
      project_id: projectId,
      owner_id: user.id,
      platform,
      wrapper_type: wrapperType,
      status,
      artifact_type: artifactType === "wrapper_zip" ? "wrapper_zip" : artifactType,
      version_name: (cfg.version_name as string) ?? "0.0.1",
      version_code: (cfg.android_version_code as number) ?? 1,
      artifact_url: artifactUrl,
      logs,
      error_message:
        status === "requires_builder_config"
          ? "Binary build requires a connected Android builder or build locally from the wrapper ZIP. No APK/AAB was faked."
          : null,
      action_credits_charged: actionCreditsCharged,
      provider_cost_usd:
        artifactType === "wrapper_zip" ? 0 : actionCreditsCharged > 0 ? (actionCreditsCharged / 10) / 5 : 0,
      meta: { storage_path: storagePath, file_count: wrapperFiles.length },
      completed_at: status === "success" ? new Date().toISOString() : null,
    } as never)
    .select("*")
    .single();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  return NextResponse.json({
    job,
    downloadUrl: artifactUrl,
    quote: buildQuote,
    honestStatus: status,
  });
}
