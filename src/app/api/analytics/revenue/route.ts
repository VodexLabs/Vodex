import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { computeMrrArrCents } from "@/lib/generated-app-payments/revenue-metrics";

export const dynamic = "force-dynamic";

type RevenueRow = {
  project_id: string;
  provider: string;
  event_type: string;
  amount_cents: number;
  currency: string;
  status: string;
  occurred_at: string;
};

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("unauthorized", "Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const appId = searchParams.get("appId")?.trim() || null;
    const provider = searchParams.get("provider")?.trim() || null;
    const from = searchParams.get("from")?.trim() || null;
    const to = searchParams.get("to")?.trim() || null;

    const admin = createServiceRoleClient();
    if (!admin) {
      return jsonOk({
        grossRevenueCents: 0,
        refundsCents: 0,
        netRevenueCents: 0,
        successfulPayments: 0,
        failedPayments: 0,
        activeSubscriptions: 0,
        newSubscriptions: 0,
        cancellations: 0,
        mrrCents: 0,
        arrCents: 0,
        byApp: [],
        byProvider: [],
        recent: [],
        webhookWarnings: ["Revenue tables unavailable — apply payment migrations"],
        currency: "USD",
      });
    }

    let q = admin
      .from("generated_app_revenue_events" as never)
      .select(
        "project_id, provider, event_type, amount_cents, currency, status, occurred_at",
      )
      .eq("owner_user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(5000);

    if (appId) q = q.eq("project_id", appId);
    if (provider) q = q.eq("provider", provider);
    if (from) q = q.gte("occurred_at", from);
    if (to) q = q.lte("occurred_at", to);

    const { data, error } = await q;
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return jsonOk({
          grossRevenueCents: 0,
          refundsCents: 0,
          netRevenueCents: 0,
          successfulPayments: 0,
          failedPayments: 0,
          activeSubscriptions: 0,
          newSubscriptions: 0,
          cancellations: 0,
          mrrCents: 0,
          arrCents: 0,
          byApp: [],
          byProvider: [],
          recent: [],
          webhookWarnings: [
            "Apply migration supabase/migrations/20260702120000_payment_revenue_ledger.sql",
          ],
          currency: "USD",
          empty: true,
        });
      }
      return jsonError("query_failed", error.message, 500);
    }

    const rows = (data ?? []) as unknown as RevenueRow[];
    let gross = 0;
    let refunds = 0;
    let successful = 0;
    let failed = 0;
    const byApp = new Map<string, number>();
    const byProvider = new Map<string, number>();
    const recent = rows.slice(0, 20).map((r) => ({
      projectId: r.project_id,
      provider: r.provider,
      eventType: r.event_type,
      amountCents: r.amount_cents,
      currency: r.currency,
      status: r.status,
      occurredAt: r.occurred_at,
    }));

    for (const r of rows) {
      if (r.amount_cents < 0) refunds += Math.abs(r.amount_cents);
      else gross += r.amount_cents;
      if (r.status === "succeeded" || r.status === "paid") successful += 1;
      if (r.status === "failed") failed += 1;
      byApp.set(r.project_id, (byApp.get(r.project_id) ?? 0) + r.amount_cents);
      byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + r.amount_cents);
    }

    const { data: projects } = await supabase.from("projects").select("id, name").eq("owner_id", user.id);
    const nameById = new Map((projects ?? []).map((p) => [p.id, p.name ?? "App"]));

    const byAppList = [...byApp.entries()]
      .map(([projectId, cents]) => ({
        projectId,
        name: nameById.get(projectId) ?? "App",
        revenueCents: cents,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

    const byProviderList = [...byProvider.entries()]
      .map(([p, cents]) => ({ provider: p, revenueCents: cents }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

    let activeSubscriptions = 0;
    let subQ = admin
      .from("generated_app_subscriptions" as never)
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (appId) subQ = subQ.eq("project_id", appId);
    else {
      const { data: owned } = await supabase.from("projects").select("id").eq("owner_id", user.id);
      const ids = (owned ?? []).map((p) => p.id);
      if (ids.length > 0) subQ = subQ.in("project_id", ids);
    }
    const { count: subCount } = await subQ;
    if (typeof subCount === "number") activeSubscriptions = subCount;

    const { mrrCents, arrCents } = await computeMrrArrCents({
      ownerUserId: user.id,
      projectId: appId,
    });

    return jsonOk({
      grossRevenueCents: gross,
      refundsCents: refunds,
      netRevenueCents: gross - refunds,
      successfulPayments: successful,
      failedPayments: failed,
      activeSubscriptions,
      newSubscriptions: rows.filter((r) => r.event_type.includes("subscription") && r.amount_cents > 0)
        .length,
      cancellations: rows.filter((r) => r.event_type.includes("cancel")).length,
      mrrCents,
      arrCents,
      byApp: byAppList,
      byProvider: byProviderList,
      recent,
      webhookWarnings: [],
      currency: "USD",
      empty: rows.length === 0,
    });
  } catch (err) {
    console.error("[analytics/revenue]", err);
    return jsonError("internal_error", err instanceof Error ? err.message : "Failed", 500);
  }
}
