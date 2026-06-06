import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireProjectId, jsonMissingId, jsonNotFound, jsonUnauthorized } from "@/lib/ids/required-ids";
import { reconcileProjectLifecycle } from "@/lib/projects/reconcile-lifecycle";
import { LIFECYCLE_META } from "@/lib/projects/project-lifecycle";
import { resolveDisplayPublicUrl } from "@/lib/publish/publish-service";
import { wildcardSubdomainEnabled } from "@/lib/publish/publish-config";
import { computeAppHealthScore } from "@/lib/health/compute-app-health-score";
import { isProjectPublished } from "@/lib/dashboard/section-access";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await ctx.params;
  const projectId = requireProjectId(rawId);
  if (!projectId) return jsonMissingId("projectId", "Project id is required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonUnauthorized();

  const writer = createServiceRoleClient() ?? supabase;
  const { data: project } = await writer
    .from("projects")
    .select(
      "id, owner_id, name, slug, status, framework, preview_url, published_subdomain, build_status, metadata, description, updated_at, app_name, short_description, icon_url",
    )
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return jsonNotFound();

  const { lifecycle, fileCount, reconciled } = await reconcileProjectLifecycle(
    writer,
    projectId,
    user.id,
  );
  const meta = LIFECYCLE_META[lifecycle];

  const { count: jobCount } = await writer
    .from("build_jobs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: jobs } = await writer
    .from("build_jobs")
    .select("credits_charged, completed_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  const totalCredits = (jobs ?? []).reduce(
    (sum, j) => sum + (Number((j as { credits_charged?: number }).credits_charged) || 0),
    0,
  );
  const lastBuildAt =
    (jobs?.[0] as { completed_at?: string | null; created_at?: string })?.completed_at ??
    (jobs?.[0] as { created_at?: string })?.created_at ??
    null;

  const { data: integrationRows } = await writer
    .from("app_integration_connections" as never)
    .select("provider, status")
    .eq("project_id", projectId)
    .eq("status", "connected")
    .limit(5);

  const { data: paymentRows } = await writer
    .from("app_payment_provider_connections" as never)
    .select("provider, status")
    .eq("project_id", projectId)
    .eq("status", "connected")
    .limit(3);

  const { data: mobileRow } = await writer
    .from("mobile_app_configs" as never)
    .select("readiness_score")
    .eq("project_id", projectId)
    .maybeSingle();

  const { data: securityScans } = await writer
    .from("app_security_scans" as never)
    .select("findings, status")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);

  const { data: activityRows } = await writer
    .from("app_activity_events" as never)
    .select("id, summary, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(8);

  const securityFindings = (securityScans?.[0] as { findings?: unknown[] } | undefined)?.findings ?? [];
  const securityOk = Array.isArray(securityFindings) && securityFindings.length === 0;

  const metaObj =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {};

  const published = isProjectPublished(project);
  const hasCriticalSecurity = Array.isArray(securityFindings)
    ? securityFindings.some((f) => {
        const row = f as { severity?: string };
        return row.severity === "critical" || row.severity === "high";
      })
    : false;

  const health = computeAppHealthScore({
    lifecycleStatus: lifecycle,
    buildStatus: project.build_status,
    fileCount: fileCount ?? 0,
    published,
    integrationsConnected: (integrationRows ?? []).length > 0,
    paymentsConnected: (paymentRows ?? []).length > 0,
    mobileReadiness: Number((mobileRow as { readiness_score?: number } | null)?.readiness_score ?? 0),
    securityOk: securityScans?.length ? securityFindings.length === 0 : true,
    hasCriticalSecurityFindings: hasCriticalSecurity,
    filesReadyPreviewFailed: metaObj.files_ready_preview_failed === true,
  });

  return NextResponse.json({
    project,
    lifecycle_status: lifecycle,
    lifecycle: meta,
    fileCount,
    buildJobCount: jobCount ?? 0,
    reconciled,
    public_url: resolveDisplayPublicUrl(project),
    publish_mode: wildcardSubdomainEnabled() ? "subdomain" : "path",
    builder_url: `/apps/${projectId}/builder`,
    dashboard_url: `/apps/${projectId}/dashboard`,
    usage: {
      totalCredits,
      lastBuildAt,
    },
    integrations_connected: (integrationRows ?? []).length > 0,
    payments_connected: (paymentRows ?? []).length > 0,
    custom_domain: Boolean(metaObj.custom_domain ?? project.published_subdomain),
    mobile_readiness: Number((mobileRow as { readiness_score?: number } | null)?.readiness_score ?? 0),
    security_ok: securityOk,
    recent_activity: (activityRows ?? []).map((r) => ({
      id: String((r as { id: string }).id),
      summary: String((r as { summary?: string }).summary ?? "Activity"),
      at: String((r as { created_at: string }).created_at),
    })),
    healthScore: health.healthScore,
    healthLabel: health.healthLabel,
    preview_ok: health.previewOk,
    publish_ok: health.publishOk,
  });
}
