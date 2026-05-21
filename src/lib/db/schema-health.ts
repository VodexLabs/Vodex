/**
 * Legacy adapter — delegates to canonical getAdminRuntimeHealth().
 */
import {
  getAdminRuntimeHealth,
  type AdminRuntimeHealth,
  type AdminRuntimeMissingItem,
} from "@/lib/db/admin-runtime-health";

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
  postgrestCacheLikelyStale?: boolean;
  source?: string;
  /** Canonical health payload (preferred for new UI) */
  runtime?: AdminRuntimeHealth;
  contradictions?: string[];
};

const USER_ACTION_HINT =
  "Click Copy SQL patch, paste into Supabase SQL Editor, run the entire file, wait 60s, then Reload schema.";

function mapMissing(item: AdminRuntimeMissingItem): SchemaMissingItem {
  if (item.type === "table") {
    return { type: "table", table: item.name, hint: item.fix };
  }
  return { type: "rpc", rpc: item.name, hint: `${item.reason}: ${item.fix}` };
}

function classifyIssue(h: AdminRuntimeHealth): ChargeTokensIssue {
  const ct = h.rpcs.charge_tokens;
  if (h.ok && ct.callableByPostgrest) return null;
  if (ct.existsInPostgres && !ct.callableByPostgrest) return "stale_cache";
  if (!ct.existsInPostgres) return "missing";
  if (!ct.executableByServiceRole) return "service_role";
  return "stale_cache";
}

export function mapAdminRuntimeToSchemaHealth(h: AdminRuntimeHealth): SchemaHealthResult {
  const charge = h.rpcs.charge_tokens;
  const issue = classifyIssue(h);

  return {
    ok: h.ok,
    missing: h.missing.map(mapMissing),
    projectRef: h.projectRef,
    checkedAt: h.checkedAt,
    migrationHint: USER_ACTION_HINT,
    userActionHint: USER_ACTION_HINT,
    tablesChecked: Object.keys(h.tables).length,
    chargeTokensRpc: charge.callableByPostgrest && charge.executableByServiceRole,
    chargeTokensIssue: issue,
    chargeTokensProbe: {
      postgresExists: charge.existsInPostgres,
      postgresCatalogReadable: !h.helperRpcUnavailable,
      postgrestCallable: charge.callableByPostgrest,
      serviceRoleExecutable: charge.executableByServiceRole,
      lastError: charge.lastError ?? null,
    },
    chargeTokensUserMessage: issue === "stale_cache"
      ? "PostgREST cannot call charge_tokens yet — reload schema cache."
      : issue === "missing"
        ? "charge_tokens not verified in Postgres."
        : undefined,
    chargeTokensDiagnosis: h.missing.find((m) => m.name === "charge_tokens")?.reason,
    chargeTokensNextAction: h.missing.find((m) => m.name === "charge_tokens")?.fix,
    billingTables: {
      profiles: h.tables.profiles.exists,
      credit_events: h.tables.credit_events.exists,
      token_ledger: h.tables.token_ledger.exists,
      ai_usage_logs: h.tables.ai_usage_logs.exists,
    },
    postgrestCacheLikelyStale:
      charge.existsInPostgres && !charge.callableByPostgrest,
    source: h.source,
    runtime: h,
    contradictions: h.contradictions,
  };
}

/** @deprecated Prefer getAdminRuntimeHealth — kept for diagnostics bundle compatibility */
export async function checkRuntimeSchemaHealth(): Promise<SchemaHealthResult> {
  const h = await getAdminRuntimeHealth({ refresh: false });
  return mapAdminRuntimeToSchemaHealth(h);
}

/** Column probes retained for builder/onboarding health only */
export const REQUIRED_SCHEMA: Record<string, readonly string[]> = {
  profiles: ["id", "email", "credits_remaining"],
  projects: ["id", "owner_id", "name"],
};
