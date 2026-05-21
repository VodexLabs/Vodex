import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getSupabasePublicUrl } from "@/lib/supabase/auth-domain";
import { probeChargeTokensRpcDetailed } from "@/lib/db/probe-charge-tokens-rpc";
import {
  buildChargeTokensProbePayload,
  CANONICAL_CHARGE_TOKENS_ARG_NAMES,
  projectRefFromSupabaseUrl,
} from "@/lib/db/charge-tokens-rpc";
import {
  PROJECT_IDENTITY_COLUMNS,
  RUNTIME_REQUIRED_TABLES,
} from "@/lib/db/runtime-schema-manifest";

export const dynamic = "force-dynamic";

async function probeTableExists(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  table: string,
): Promise<boolean> {
  const { error } = await admin.from(table as "profiles").select("id").limit(0);
  if (!error) return true;
  const m = error.message.toLowerCase();
  return !m.includes("could not find the table") && !m.includes("does not exist");
}

async function probeProfileColumns(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
): Promise<string[]> {
  const cols: string[] = [];
  const probe = [
    "id",
    "email",
    "plan_id",
    "credits_remaining",
    "credits_limit",
    "onboarding_completed",
    "workspace_name",
    "plan_interval",
    "full_name",
    "display_name",
    "avatar_url",
    "preferred_model",
    "metadata",
  ];
  for (const col of probe.slice(0, 50)) {
    const { error } = await admin.from("profiles").select(col).limit(0);
    if (!error) cols.push(col);
  }
  return cols;
}

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const supabaseUrl = getSupabasePublicUrl();
  const projectRef = projectRefFromSupabaseUrl(supabaseUrl);
  const appUrl = getAppUrl();
  const admin = createServiceRoleClient();

  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        projectRef,
        appUrl,
        error: "SUPABASE_SERVICE_ROLE_KEY not configured",
      },
      { status: 503 },
    );
  }

  const tables: Record<string, boolean> = {};
  const missingItems: string[] = [];

  for (const table of RUNTIME_REQUIRED_TABLES) {
    const exists = await probeTableExists(admin, table);
    tables[table] = exists;
    if (!exists) missingItems.push(`table:${table}`);
  }

  const profileColumns = await probeProfileColumns(admin);
  const profilesExists = tables.profiles === true;

  const projectColumns: Record<string, boolean> = {};
  for (const col of PROJECT_IDENTITY_COLUMNS) {
    const { error } = await admin.from("projects").select(col).limit(0);
    projectColumns[col] = !error;
    if (error && !error.message.toLowerCase().includes("does not exist")) {
      missingItems.push(`column:projects.${col}`);
    }
  }

  const chargeProbe = await probeChargeTokensRpcDetailed();

  const chargeTokensNamedParams = {
    expected: [...CANONICAL_CHARGE_TOKENS_ARG_NAMES],
    postgrestCallable: chargeProbe.postgrestCallable,
    serviceRoleExecutable: chargeProbe.serviceRoleExecutable,
    testPayloadKeys: Object.keys(
      buildChargeTokensProbePayload({
        p_reason: "debug_schema",
        p_idempotency_key: `debug_${Date.now()}`,
      }),
    ),
  };

  let conversationsInsertOk = false;
  let conversationsInsertError: string | null = null;
  if (tables.conversations) {
    const probeId = "00000000-0000-0000-0000-000000000001";
    const { error: insErr } = await admin.from("conversations").insert({
      id: probeId,
      user_id: probeId,
      title: "__schema_probe__",
      model_id: "automatic",
    } as never);
    if (!insErr) {
      conversationsInsertOk = true;
      await admin.from("conversations").delete().eq("id", probeId);
    } else {
      conversationsInsertError = insErr.message.slice(0, 200);
      if (!insErr.message.includes("duplicate")) {
        missingItems.push("conversations:insert_failed");
      } else {
        conversationsInsertOk = true;
      }
    }
  }

  const ok =
    missingItems.length === 0 &&
    chargeProbe.ok &&
    chargeProbe.postgrestCallable &&
    chargeProbe.serviceRoleExecutable;

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      projectRef,
      appUrl,
      resolvedAppOrigin: appUrl,
      supabaseUrlHost: supabaseUrl ? new URL(supabaseUrl).host : null,
      profiles: {
        existsViaPostgrest: profilesExists,
        columnsVisibleToPostgrest: profileColumns.slice(0, 50),
        columnCount: profileColumns.length,
      },
      tables,
      projects: { identityColumns: projectColumns },
      charge_tokens: {
        postgresExists: chargeProbe.postgresExists,
        postgresSignatures: chargeProbe.postgresSignatures.slice(0, 20),
        postgresCanonical: chargeProbe.postgresCanonical,
        postgrestCallable: chargeProbe.postgrestCallable,
        serviceRoleExecutable: chargeProbe.serviceRoleExecutable,
        postgrestError: chargeProbe.postgrestError,
        serviceRoleError: chargeProbe.serviceRoleError,
        namedParams: chargeTokensNamedParams,
        lastError: chargeProbe.lastError,
      },
      ensure_user_profile: {
        postgresExists: chargeProbe.ensureUserProfilePostgresExists,
        signatures: chargeProbe.ensureUserProfileSignatures.slice(0, 10),
        canonical: chargeProbe.ensureUserProfileCanonical,
        returnsVoid: chargeProbe.ensureUserProfileReturnsVoid,
      },
      conversations: {
        serviceRoleInsertOk: conversationsInsertOk,
        insertError: conversationsInsertError,
      },
      missingItems,
      note: "No secrets returned. Probes use service role + PostgREST only.",
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
