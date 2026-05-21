/**
 * Runtime + admin schema health — single source of truth for /api/admin/schema-health.
 */
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getChargeTokensProbeCached } from "@/lib/db/charge-probe-cache";
import type { ChargeTokensProbeResult } from "@/lib/db/probe-charge-tokens-rpc";
import {
  PROJECT_IDENTITY_COLUMNS,
  RUNTIME_REQUIRED_RPCS,
  RUNTIME_REQUIRED_TABLES,
} from "@/lib/db/runtime-schema-manifest";

export type SchemaMissingItem = {
  type: "table" | "column" | "rpc";
  table?: string;
  column?: string;
  rpc?: string;
  hint?: string;
};

export type ChargeTokensIssue =
  | "missing"
  | "stale_cache"
  | "param_mismatch"
  | "service_role"
  | null;

export type SchemaHealthResult = {
  ok: boolean;
  missing: SchemaMissingItem[];
  projectRef: string | null;
  checkedAt: string;
  migrationHint: string;
  userActionHint: string;
  tablesChecked: number;
  chargeTokensRpc: boolean;
  chargeTokensIssue: ChargeTokensIssue;
  chargeTokensProbe?: {
    postgresExists: boolean;
    postgresCatalogReadable: boolean;
    postgrestCallable: boolean;
    serviceRoleExecutable: boolean;
    lastError: string | null;
  };
  chargeTokensUserMessage?: string;
  chargeTokensDiagnosis?: string;
  chargeTokensNextAction?: string;
  billingTables?: {
    profiles: boolean;
    credit_events: boolean;
    token_ledger: boolean;
    ai_usage_logs: boolean;
  };
};

const USER_ACTION_HINT =
  "Copy and run the SQL patch below in Supabase SQL Editor, then click Reload schema.";

/** Columns probed per table (idempotent migrations may add these over time). */
export const REQUIRED_SCHEMA: Record<string, readonly string[]> = {
  profiles: [
    "id",
    "email",
    "credits_remaining",
    "credits_limit",
    "credits_used",
    "plan_id",
    "plan_interval",
    "onboarding_completed",
  ],
  ai_usage_logs: [
    "id",
    "user_id",
    "user_email",
    "project_id",
    "conversation_id",
    "message_id",
    "provider",
    "model_id",
    "mode",
    "operation_id",
    "tokens_input",
    "tokens_output",
    "tokens_charged",
    "credits_charged",
    "error_message",
    "created_at",
  ],
  admin_actions: [
    "id",
    "admin_id",
    "user_id",
    "target_user_id",
    "action",
    "action_type",
    "amount",
    "reason",
    "metadata",
    "created_at",
  ],
  subscriptions: [
    "id",
    "user_id",
    "plan_id",
    "status",
    "stripe_customer_id",
    "stripe_subscription_id",
    "stripe_price_id",
    "current_period_end",
    "cancel_at_period_end",
    "pending_downgrade",
  ],
  projects: [
    "id",
    "owner_id",
    "user_id",
    "name",
    "app_name",
    "slug",
    "description",
    "icon_url",
    "icon_svg",
    "status",
    "build_status",
    "last_build_id",
    "last_build_at",
    "preview_url",
    "live_url",
    "metadata",
  ],
  build_jobs: [
    "id",
    "project_id",
    "user_id",
    "status",
    "mode",
    "prompt",
    "model_id",
    "provider",
    "credits_estimated",
    "credits_charged",
    "file_count",
    "error_message",
    "completed_at",
    "failed_at",
  ],
  app_files: ["id", "project_id", "build_id", "path", "content", "language", "action"],
  project_integrations: [
    "id",
    "project_id",
    "owner_id",
    "provider",
    "display_name",
    "status",
    "connected_at",
    "last_tested_at",
    "last_error",
    "metadata",
  ],
  project_secrets: [
    "id",
    "project_id",
    "owner_id",
    "provider",
    "key",
    "encrypted_value",
    "masked_value",
  ],
  preview_errors: [
    "id",
    "project_id",
    "build_id",
    "severity",
    "message",
    "file_path",
    "line",
  ],
  publish_records: [
    "id",
    "project_id",
    "build_id",
    "user_id",
    "status",
    "url",
    "subdomain",
    "custom_domain",
    "published_at",
  ],
  conversations: ["id", "user_id", "project_id", "title", "mode", "status"],
  messages: ["id", "conversation_id", "project_id", "user_id", "role", "content", "mode"],
};

const REQUIRED_RPCS = [...RUNTIME_REQUIRED_RPCS] as const;

function projectRefFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

function isTableMissingError(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  return (
    code === "42P01" ||
    m.includes("does not exist") ||
    m.includes("could not find the table")
  );
}

function parseMissingColumnsFromError(message: string, columns: readonly string[]): string[] {
  const m = message.toLowerCase();
  const missing: string[] = [];
  for (const col of columns) {
    if (m.includes(col.toLowerCase())) missing.push(col);
  }
  if (missing.length > 0) return missing;
  if (m.includes("column") || m.includes("schema cache")) return [...columns];
  return [];
}

async function probeTableColumns(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  table: string,
  columns: readonly string[],
): Promise<{ tableMissing: boolean; missingColumns: string[] }> {
  const select = columns.join(",");
  const { error } = await admin.from(table as "projects").select(select).limit(0);

  if (!error) return { tableMissing: false, missingColumns: [] };

  if (isTableMissingError(error.message, error.code)) {
    return { tableMissing: true, missingColumns: [] };
  }

  const missingColumns = parseMissingColumnsFromError(error.message, columns);
  if (missingColumns.length > 0) {
    return { tableMissing: false, missingColumns };
  }

  return { tableMissing: false, missingColumns: [...columns] };
}

function classifyChargeTokensIssue(probe: ChargeTokensProbeResult): ChargeTokensIssue {
  if (probe.ok) return null;
  switch (probe.issue) {
    case "stale_postgrest":
    case "catalog_unavailable":
      return "stale_cache";
    case "missing_in_postgres":
    case "tables_missing":
    case "wrong_pg_signature":
    case "duplicate_overloads":
    case "ensure_void_return":
      return "missing";
    case "service_role_missing":
    case "permission_denied":
      return "service_role";
    default:
      break;
  }
  if (probe.postgresExists && !probe.postgrestCallable) return "stale_cache";
  if (!probe.postgresExists && probe.postgresCatalogReadable) return "missing";
  if (!probe.postgresExists) return "stale_cache";
  return "missing";
}

export async function checkRuntimeSchemaHealth(): Promise<SchemaHealthResult> {
  const checkedAt = new Date().toISOString();
  const projectRef = projectRefFromEnv();
  const admin = createServiceRoleClient();

  if (!admin) {
    return {
      ok: false,
      missing: [
        {
          type: "table",
          table: "(service)",
          hint: "Set SUPABASE_SERVICE_ROLE_KEY in server env",
        },
      ],
      projectRef,
      checkedAt,
      migrationHint: USER_ACTION_HINT,
      userActionHint: USER_ACTION_HINT,
      tablesChecked: 0,
      chargeTokensRpc: false,
      chargeTokensIssue: "service_role",
    };
  }

  const missing: SchemaMissingItem[] = [];
  let tablesChecked = 0;

  for (const table of RUNTIME_REQUIRED_TABLES) {
    if (!(table in REQUIRED_SCHEMA)) {
      const { error } = await admin.from(table as "projects").select("id").limit(0);
      if (error && isTableMissingError(error.message, error.code)) {
        missing.push({
          type: "table",
          table,
          hint: `CREATE TABLE public.${table} — run full runtime SQL patch in Supabase SQL Editor`,
        });
      }
      tablesChecked += 1;
    }
  }

  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    tablesChecked += 1;
    const result = await probeTableColumns(admin, table, columns);
    if (result.tableMissing) {
      missing.push({
        type: "table",
        table,
        hint: `CREATE TABLE public.${table} — see scripts/full-runtime-schema-repair.sql`,
      });
      continue;
    }
    for (const col of result.missingColumns) {
      missing.push({
        type: "column",
        table,
        column: col,
        hint: `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} …`,
      });
    }
  }

  const chargeProbe = await getChargeTokensProbeCached();
  const chargeTokensRpc = chargeProbe.ok;
  const chargeTokensIssue = classifyChargeTokensIssue(chargeProbe);
  const chargeTokensUserMessage = chargeProbe.userMessage;
  if (!chargeTokensRpc) {
    missing.push({
      type: "rpc",
      rpc: "charge_tokens",
      hint: chargeProbe.actionHint || chargeTokensUserMessage || USER_ACTION_HINT,
    });
  }

  if (
    !chargeProbe.ensureUserProfilePostgresExists &&
    chargeProbe.postgresCatalogReadable &&
    !chargeProbe.ensureUserProfileReturnsVoid
  ) {
    missing.push({
      type: "rpc",
      rpc: "ensure_user_profile",
      hint: chargeProbe.actionHint || "Run Copy SQL fix in Supabase SQL Editor.",
    });
  } else if (chargeProbe.ensureUserProfileReturnsVoid) {
    missing.push({
      type: "rpc",
      rpc: "ensure_user_profile",
      hint: "Old ensure_user_profile(void) detected — run Copy SQL fix.",
    });
  }

  for (const col of PROJECT_IDENTITY_COLUMNS) {
    const { error } = await admin.from("projects").select(col).limit(0);
    if (error && !isTableMissingError(error.message, error.code)) {
      const cols = parseMissingColumnsFromError(error.message, [col]);
      for (const c of cols) {
        missing.push({
          type: "column",
          table: "projects",
          column: c,
          hint: `ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ${c} …`,
        });
      }
    }
  }

  for (const rpc of RUNTIME_REQUIRED_RPCS) {
    if (rpc === "charge_tokens" || rpc === "ensure_user_profile") continue;
    const { error } = await admin.rpc(rpc as "charge_tokens", {} as never);
    if (error?.message?.includes("Could not find the function")) {
      missing.push({
        type: "rpc",
        rpc,
        hint: `Install public.${rpc} via runtime SQL patch`,
      });
    }
  }

  if (!chargeProbe.tables.profiles && !missing.some((m) => m.table === "profiles")) {
    missing.push({
      type: "table",
      table: "profiles",
      hint: "Run Copy SQL fix — creates public.profiles without deleting data.",
    });
  }

  const profilesOk = !missing.some((m) => m.table === "profiles");
  const rpcOnlyBroken =
    !chargeTokensRpc && profilesOk && missing.filter((m) => m.type !== "rpc").length === 0;

  const ok = missing.length === 0 && chargeTokensRpc;

  return {
    ok,
    missing: rpcOnlyBroken ? missing.filter((m) => m.type === "rpc") : missing,
    projectRef,
    checkedAt,
    migrationHint: USER_ACTION_HINT,
    tablesChecked,
    chargeTokensRpc,
    chargeTokensIssue,
    chargeTokensProbe: {
      postgresExists: chargeProbe.postgresExists,
      postgresCatalogReadable: chargeProbe.postgresCatalogReadable,
      postgrestCallable: chargeProbe.postgrestCallable,
      serviceRoleExecutable: chargeProbe.serviceRoleExecutable,
      lastError: chargeProbe.lastError,
    },
    chargeTokensUserMessage,
    chargeTokensDiagnosis: chargeProbe.diagnosis,
    chargeTokensNextAction: chargeProbe.nextAction,
    billingTables: chargeProbe.tables,
    userActionHint: chargeTokensRpc
      ? USER_ACTION_HINT
      : (chargeProbe.nextAction || chargeProbe.actionHint || chargeTokensUserMessage || USER_ACTION_HINT),
  };
}
