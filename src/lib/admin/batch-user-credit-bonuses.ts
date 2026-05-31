import type { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  capExplicitBonus,
  creditPeriodStart,
  explicitBuildGrantAmount,
  isGrantInCreditPeriod,
} from "@/lib/credits/explicit-grants";

const ACTION_GRANT_TYPES = new Set(["admin_grant", "referral", "grant", "purchase", "top_up"]);

export async function batchExplicitCreditBonuses(
  admin: ReturnType<typeof createSupabaseAdmin>,
  profiles: Array<{ id: string; credits_reset_at: string | null }>,
): Promise<{ buildBonus: Map<string, number>; actionGrantBonus: Map<string, number> }> {
  const buildBonus = new Map<string, number>();
  const actionGrantBonus = new Map<string, number>();
  const ids = profiles.map((p) => p.id);
  if (ids.length === 0) {
    return { buildBonus, actionGrantBonus };
  }

  const periodStartByUser = new Map(
    profiles.map((p) => [p.id, creditPeriodStart(p.credits_reset_at)] as const),
  );

  const [ledgerRes, actionRes] = await Promise.all([
    admin
      .from("token_ledger" as never)
      .select("user_id, amount, source, metadata, created_at")
      .in("user_id" as never, ids)
      .neq("amount" as never, 0),
    admin
      .from("action_credit_events" as never)
      .select("owner_user_id, action_credits_charged, action_type, created_at")
      .in("owner_user_id" as never, ids)
      .is("project_id" as never, null),
  ]);

  for (const row of (ledgerRes.data ?? []) as Array<{
    user_id: string;
    amount?: number;
    source?: string;
    metadata?: unknown;
    created_at?: string;
  }>) {
    const periodStart = periodStartByUser.get(row.user_id);
    if (!periodStart || !isGrantInCreditPeriod(row.created_at, periodStart)) continue;
    const grant = explicitBuildGrantAmount(row);
    if (grant <= 0) continue;
    buildBonus.set(row.user_id, (buildBonus.get(row.user_id) ?? 0) + grant);
  }

  for (const id of ids) {
    buildBonus.set(id, capExplicitBonus(buildBonus.get(id) ?? 0));
  }

  for (const row of (actionRes.data ?? []) as Array<{
    owner_user_id: string;
    action_credits_charged?: number;
    action_type?: string;
    created_at?: string;
  }>) {
    const periodStart = periodStartByUser.get(row.owner_user_id);
    if (!periodStart || !isGrantInCreditPeriod(row.created_at, periodStart)) continue;
    const type = String(row.action_type ?? "");
    if (!ACTION_GRANT_TYPES.has(type)) continue;
    const charged = Number(row.action_credits_charged) || 0;
    if (charged >= 0) continue;
    const grant = Math.abs(charged);
    actionGrantBonus.set(
      row.owner_user_id,
      (actionGrantBonus.get(row.owner_user_id) ?? 0) + grant,
    );
  }

  for (const id of ids) {
    actionGrantBonus.set(id, capExplicitBonus(actionGrantBonus.get(id) ?? 0));
  }

  return { buildBonus, actionGrantBonus };
}

export function impliedActionBonus(
  available: number,
  planAllowance: number,
  grantBonus: number,
): number {
  const implied = Math.max(0, available - planAllowance);
  return capExplicitBonus(Math.max(grantBonus, implied));
}
