import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { bustAdminRuntimeHealthCache } from "@/lib/cache/admin-runtime-health-cache";
import { invalidateChargeTokensProbeCache } from "@/lib/db/charge-probe-cache";
import { verifyChargeTokensLiveTest } from "@/lib/db/admin-runtime-health";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  bustAdminRuntimeHealthCache();
  invalidateChargeTokensProbeCache();

  const result = await verifyChargeTokensLiveTest({
    ownerUserId: gate.user.id,
    ownerAdminId: gate.user.id,
  });

  return NextResponse.json(
    {
      ok: result.callable && result.chargedTest,
      callable: result.callable,
      chargedTest: result.chargedTest,
      restored: result.restored,
      exactParamsUsed: result.exactParamsUsed,
      lastError: result.lastError,
      diagnosis: result.diagnosis,
      rpcSignatureUsed: [
        "p_user_id uuid",
        "p_amount integer",
        "p_reason text",
        "p_idempotency_key text",
        "p_metadata jsonb",
        "p_project_id uuid",
        "p_conversation_id uuid",
      ],
      suggestedFix:
        result.diagnosis === "postgrest_schema_cache_or_signature_issue"
          ? "Run Copy SQL patch, NOTIFY pgrst reload schema, wait 60s, then Verify again."
          : null,
      checkedAt: new Date().toISOString(),
    },
    { headers: NO_STORE },
  );
}
