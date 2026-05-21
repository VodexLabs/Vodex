import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import {
  CANONICAL_CHARGE_TOKENS_PG_ARGS,
  CANONICAL_ENSURE_USER_PROFILE_PG_ARGS,
} from "@/lib/db/charge-tokens-rpc";
import { CANONICAL_EXPECTED, runChargeTokensDebugReport } from "@/lib/db/probe-charge-tokens-rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const report = await runChargeTokensDebugReport(gate.user.id);

  return NextResponse.json(
    {
      ok: report.ok,
      projectRef: report.projectRef,
      supabaseUrlHost: report.supabaseUrlHost,
      appEnv: report.appEnv,
      serviceRolePresent: report.serviceRolePresent,
      tables: report.tables,
      pgCatalog: {
        readable: report.postgresCatalogReadable,
        catalog_error: report.catalogProbeError,
        charge_tokens: report.postgresSignatures.map((s) => ({
          args: s.args,
          returns: s.returns,
        })),
        ensure_user_profile: report.ensureUserProfileSignatures.map((s) => ({
          args: s.args,
          returns: s.returns,
        })),
        charge_tokens_exists: report.postgresExists,
        charge_tokens_canonical: report.postgresCanonical,
        duplicate_overloads: report.postgresDuplicateOverloads,
        ensure_returns_void: report.ensureUserProfileReturnsVoid,
      },
      canonicalExpected: {
        charge_tokensArgs: CANONICAL_EXPECTED.charge_tokensArgs,
        ensure_user_profileArgs: CANONICAL_EXPECTED.ensure_user_profileArgs,
        charge_tokensPgArgs: CANONICAL_CHARGE_TOKENS_PG_ARGS,
        ensure_user_profilePgArgs: CANONICAL_ENSURE_USER_PROFILE_PG_ARGS,
      },
      postgrestTest: {
        payload: report.testPayload,
        ok: report.postgrestCallable,
        status: report.postgrestHttpStatus,
        error: report.postgrestError,
        data: report.postgrestData,
      },
      serviceRoleDryRun: {
        ok: report.serviceRoleExecutable,
        executable: report.serviceRoleExecutable,
        result: report.serviceRoleResponsePreview,
        error: report.serviceRoleError,
      },
      diagnosis: report.diagnosis,
      nextAction: report.nextAction,
      issue: report.issue,
      userMessage: report.userMessage,
      checkedAt: report.checkedAt,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
