import { createServiceRoleClient } from "@/lib/supabase/admin";

type SubRow = {
  project_id: string;
  provider: string;
  external_subscription_id: string;
  status: string;
  metadata: { last_amount_cents?: number } | null;
};

type RevRow = {
  external_subscription_id: string | null;
  amount_cents: number;
  occurred_at: string;
};

export async function computeMrrArrCents(input: {
  ownerUserId: string;
  projectId?: string | null;
}): Promise<{ mrrCents: number; arrCents: number }> {
  const admin = createServiceRoleClient();
  if (!admin) return { mrrCents: 0, arrCents: 0 };

  let subQ = admin
    .from("generated_app_subscriptions" as never)
    .select("project_id, provider, external_subscription_id, status, metadata")
    .eq("status", "active");

  if (input.projectId) subQ = subQ.eq("project_id", input.projectId);

  const { data: subs } = await subQ;
  const activeSubs = (subs ?? []) as unknown as SubRow[];
  if (activeSubs.length === 0) return { mrrCents: 0, arrCents: 0 };

  const projectIds = [...new Set(activeSubs.map((s) => s.project_id))];
  let revQ = admin
    .from("generated_app_revenue_events" as never)
    .select("external_subscription_id, amount_cents, occurred_at")
    .eq("owner_user_id", input.ownerUserId)
    .in("project_id", projectIds)
    .gt("amount_cents", 0)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (input.projectId) revQ = revQ.eq("project_id", input.projectId);

  const { data: revRows } = await revQ;
  const latestBySub = new Map<string, number>();
  for (const r of (revRows ?? []) as unknown as RevRow[]) {
    if (!r.external_subscription_id) continue;
    if (!latestBySub.has(r.external_subscription_id)) {
      latestBySub.set(r.external_subscription_id, r.amount_cents);
    }
  }

  let mrr = 0;
  for (const sub of activeSubs) {
    const fromMeta = sub.metadata?.last_amount_cents;
    const fromEvent = latestBySub.get(sub.external_subscription_id);
    mrr += fromEvent ?? (typeof fromMeta === "number" ? fromMeta : 0);
  }

  return { mrrCents: mrr, arrCents: mrr * 12 };
}
