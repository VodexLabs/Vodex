import { createClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import { assertProjectOwner, writePaymentAudit } from "@/lib/generated-app-payments/connection-store";
import { verifyPaymentProviderConfig } from "@/lib/generated-app-payments/verify-provider";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; provider: string }> },
) {
  try {
    const { id: projectId, provider } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("unauthorized", "Unauthorized", 401);
    if (!(await assertProjectOwner(projectId, user.id, supabase))) {
      return jsonError("not_found", "Not found", 404);
    }

    const { row: billing } = await loadProfileBillingRow(supabase, user);
    if (!canConnectAppPayments(billing?.plan_id)) {
      return jsonError("plan_required", paymentsGateMessage(), 402);
    }

    const result = await verifyPaymentProviderConfig(
      projectId,
      provider as PaymentProviderId,
    );

    await writePaymentAudit({
      projectId,
      userId: user.id,
      provider,
      action: "verify",
      status: result.ok ? "ok" : "error",
      metadata: { message: result.message },
    });

    return jsonOk({
      message: result.message,
      status: result.ok ? result.status : "error",
    });
  } catch (err) {
    return jsonError("internal_error", err instanceof Error ? err.message : "Verify failed", 500);
  }
}
