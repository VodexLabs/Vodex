import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadProfileOptionalFields,
  loadUserProfileCore,
} from "@/lib/supabase/load-user-profile";
import { resolveWorkspaceIdForUser } from "@/lib/identity/resolve-workspace-id";
import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import { loadCanonicalCredits } from "@/lib/credits/canonical-credits";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ensurePersonalWorkspace } from "@/lib/identity/ensure-personal-workspace";

const FREE_CREDITS_FALLBACK = monthlyTokensForPlan("free");
const CANONICAL_PUBLIC_API = "https://vodex.dev/api";

export type DreamosIdentity = {
  accountId: string;
  workspaceId: string;
  ownerEmail: string;
  planId: string;
  planInterval: string;
  creditsRemaining: number;
  creditsLimit: number;
  creditsBonus: number;
  createdAt: string | null;
};

export type DreamosIdentityApiPayload = {
  ok: true;
  accountId: string;
  workspaceId: string;
  ownerEmail: string;
  plan: { id: string; interval: string };
  credits: { remaining: number; limit: number; bonus: number };
  createdAt: string | null;
  apiBaseUrl: string;
  apiAccessStatus: "enabled" | "disabled";
};

export function getDreamosApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (/localhost|127\.0\.0\.1/i.test(origin)) {
      return CANONICAL_PUBLIC_API;
    }
    return `${origin}/api`;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return `${site.replace(/\/$/, "")}/api`;

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app && !/localhost|127\.0\.0\.1/i.test(app)) {
    return `${app.replace(/\/$/, "")}/api`;
  }

  return CANONICAL_PUBLIC_API;
}

export function truncateIdentityId(value: string, head = 8, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function projectRefFromSupabaseUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

export function getSupabaseEnvSource(): "local" | "production" | "unknown" {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").toLowerCase();
  if (url.includes("127.0.0.1") || url.includes("localhost")) return "local";
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return "local";
  }
  if (process.env.NODE_ENV === "development") return "local";
  if (process.env.NODE_ENV === "production") return "production";
  return "unknown";
}

/**
 * Safe server identity load — never throws; tolerates missing billing columns.
 */
export async function buildDreamosIdentity(
  supabase: SupabaseClient,
  accountId: string,
  ownerEmail?: string | null,
): Promise<DreamosIdentity> {
  const [{ profile }, optional, workspaceIdRaw] = await Promise.all([
    loadUserProfileCore(supabase, accountId),
    loadProfileOptionalFields(supabase, accountId),
    resolveWorkspaceIdForUser(supabase, accountId),
  ]);

  const workspaceId =
    workspaceIdRaw === accountId
      ? await ensurePersonalWorkspace(supabase, accountId, ownerEmail ?? profile?.email, optional.full_name)
      : workspaceIdRaw;

  const email =
    (ownerEmail ?? "").trim() ||
    (typeof profile?.email === "string" ? profile.email : "") ||
    "";

  const planId = normalizePlanId(typeof profile?.plan_id === "string" ? profile.plan_id : "free");
  const rawRemaining =
    typeof profile?.credits_remaining === "number" ? profile.credits_remaining : FREE_CREDITS_FALLBACK;

  let creditsRemaining = rawRemaining;
  let creditsLimit = monthlyTokensForPlan(planId);
  let creditsBonus = 0;

  try {
    const admin = createSupabaseAdmin();
    const canonical = await loadCanonicalCredits({
      userId: accountId,
      planId,
      email,
      buildAvailable: rawRemaining,
      skipLedger: false,
    });
    creditsRemaining = canonical.build.available;
    creditsBonus = Math.max(canonical.build.bonusActive, 0);
    creditsLimit = Math.max(canonical.build.planAllowance + creditsBonus, canonical.build.planAllowance);
  } catch {
    creditsLimit = monthlyTokensForPlan(planId);
  }

  let createdAt: string | null = null;
  try {
    const { data: createdRow } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", accountId)
      .maybeSingle();
    if (typeof createdRow?.created_at === "string") createdAt = createdRow.created_at;
  } catch {
    /* optional */
  }

  return {
    accountId,
    workspaceId,
    ownerEmail: email,
    planId,
    planInterval: optional.plan_interval ?? "monthly",
    creditsRemaining,
    creditsLimit,
    creditsBonus: creditsBonus ?? 0,
    createdAt,
  };
}

export function toDreamosIdentityApiPayload(
  identity: DreamosIdentity,
  apiAccessStatus: "enabled" | "disabled" = "enabled",
): DreamosIdentityApiPayload {
  return {
    ok: true,
    accountId: identity.accountId,
    workspaceId: identity.workspaceId,
    ownerEmail: identity.ownerEmail,
    plan: { id: identity.planId, interval: identity.planInterval },
    credits: {
      remaining: identity.creditsRemaining,
      limit: identity.creditsLimit,
      bonus: identity.creditsBonus,
    },
    createdAt: identity.createdAt,
    apiBaseUrl: getDreamosApiBaseUrl(),
    apiAccessStatus,
  };
}
