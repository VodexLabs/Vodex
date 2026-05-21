import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getAdminRuntimeHealth } from "@/lib/db/admin-runtime-health";
import { mapAdminRuntimeToSchemaHealth } from "@/lib/db/schema-health";
import { getLastSslDiagnostic } from "@/lib/network/ssl-diagnostics-store";
import { validateSupabaseEnv } from "@/lib/supabase/validate-supabase-env";

export const dynamic = "force-dynamic";

type LooseDb = {
  from: (t: string) => {
    select: (c: string) => {
      limit: (n: number) => Promise<{ error: { message: string } | null; data: unknown[] | null }>;
      order: (a: string, o: object) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
    };
  };
};

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const admin = createServiceRoleClient();
  const runtimeHealth = await getAdminRuntimeHealth({ refresh: true });
  const schema = mapAdminRuntimeToSchemaHealth(runtimeHealth);
  const chargeProbe = {
    ok: runtimeHealth.rpcs.charge_tokens.callableByPostgrest,
    lastError: runtimeHealth.rpcs.charge_tokens.lastError ?? null,
    postgrestCallable: runtimeHealth.rpcs.charge_tokens.callableByPostgrest,
    serviceRoleExecutable: runtimeHealth.rpcs.charge_tokens.executableByServiceRole,
    postgresExists: runtimeHealth.rpcs.charge_tokens.existsInPostgres,
  };

  let loggingTableOk = false;
  let loggingTableError: string | null = null;
  let dbLogs: unknown[] = [];

  if (admin) {
    const ext = admin as unknown as LooseDb;
    const probe = await ext.from("dreamos_diagnostic_logs").select("id").limit(1);
    loggingTableOk = !probe.error;
    loggingTableError = probe.error?.message ?? null;

    if (loggingTableOk) {
      const { data } = await ext
        .from("dreamos_diagnostic_logs")
        .select(
          "id,created_at,severity,source,category,route,component,action,message,user_id,project_id,conversation_id,build_id,metadata",
        )
        .order("created_at", { ascending: false })
        .limit(120);
      dbLogs = data ?? [];
    }
  }

  const categories = {
    missing_id: filterLogs(dbLogs, "missing_id"),
    api_error: filterLogs(dbLogs, "api_error"),
    ui_action: filterLogs(dbLogs, "ui_action"),
    build: filterLogs(dbLogs, "build"),
    credit: filterLogs(dbLogs, "credit"),
    admin: filterLogs(dbLogs, "admin"),
    duplicate_prompt: filterLogs(dbLogs, "duplicate_prompt"),
    provider_blocked: filterLogs(dbLogs, "provider_blocked"),
    publish: filterLogs(dbLogs, "publish"),
    dom_wiring: filterLogs(dbLogs, "dom_wiring"),
    frontend_error: filterLogs(dbLogs, "frontend_error"),
  };

  const { data: aiErrors } = admin
    ? await admin
        .from("ai_usage_logs")
        .select("id,created_at,model_id,mode,status,error_message,operation_id,conversation_id")
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: buildJobs } = admin
    ? await admin
        .from("build_jobs")
        .select("id,created_at,status,project_id,user_id,error_message,conversation_id")
        .order("created_at", { ascending: false })
        .limit(40)
    : { data: [] };

  let pendingAdmin: unknown[] = [];
  if (admin) {
    const ext = admin as unknown as LooseDb;
    const pendingRes = await ext
      .from("admin_pending_confirmations")
      .select("id,created_at,expires_at,consumed_at,action_type,target_id,admin_email")
      .order("created_at", { ascending: false })
      .limit(20);
    pendingAdmin = pendingRes.data ?? [];
  }

  const { data: recentProjects } = admin
    ? await admin
        .from("projects")
        .select("id,name,build_status,icon_url,owner_id,updated_at")
        .order("updated_at", { ascending: false })
        .limit(15)
    : { data: [] };

  const publishIssues = (recentProjects ?? []).map((p) => {
    const issues: string[] = [];
    if (!p.id) issues.push("missing project id");
    if (!p.owner_id) issues.push("missing owner_id");
    if (!p.icon_url) issues.push("missing icon_url");
    if (p.build_status === "building") issues.push("stuck in building");
    return { projectId: p.id, name: p.name, issues };
  }).filter((x) => x.issues.length > 0);

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    logging: {
      tableOk: loggingTableOk,
      tableError: loggingTableError,
      hint: loggingTableOk
        ? null
        : "Run migration supabase/migrations/20260622120000_admin_otp_diagnostic_logs.sql",
    },
    liveEvents: dbLogs.slice(0, 80),
    missingIds: categories.missing_id,
    apiErrors: [
      ...categories.api_error,
      ...(aiErrors ?? []).map((r) => ({
        at: r.created_at,
        message: r.error_message ?? "ai_usage error",
        metadata: {
          model_id: r.model_id,
          mode: r.mode,
          operation_id: r.operation_id,
        },
      })),
    ],
    supabaseHealth: schema,
    runtimeHealth,
    creditBilling: {
      chargeProbe,
      providerBlocked: categories.provider_blocked,
      creditEvents: categories.credit,
    },
    buildPipeline: {
      jobs: buildJobs ?? [],
      logs: categories.build,
    },
    uiActions: categories.ui_action,
    publishReadiness: publishIssues,
    adminActions: {
      pending: pendingAdmin ?? [],
      logs: categories.admin,
    },
    domWiring: categories.dom_wiring,
    frontendErrors: categories.frontend_error,
    networkSsl: {
      last: getLastSslDiagnostic(),
      supabaseEnv: validateSupabaseEnv(),
    },
  });
}

function filterLogs(logs: unknown[], category: string): unknown[] {
  return (logs as Array<{ category?: string }>).filter((l) => l.category === category);
}
