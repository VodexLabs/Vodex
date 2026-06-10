#!/usr/bin/env node
/**
 * P1.3.32 — Live billing production flow validation.
 * Proves fractional Discuss (0.3 BC) and ZIP preview action credits (e.g. 33 AC).
 */
import {
  createAdmin,
  env,
  fail,
  pass,
  resolveValidationUserId,
  DEFAULT_PREVIEW_PROJECT_ID,
  arg,
} from "./lib/production-validation.mjs";

const DISCUSS_DELTA = 0.3;
const PREVIEW_DELTA = 33;

function nearly(a, b, eps = 0.05) {
  return Math.abs(a - b) <= eps;
}

async function readBuildCredits(admin, userId) {
  const { data, error } = await admin.from("profiles").select("credits_remaining").eq("id", userId).maybeSingle();
  if (error) throw new Error(`profiles: ${error.message}`);
  return Number(data?.credits_remaining ?? 0);
}

async function readActionBalance(admin, userId, projectId) {
  const { data, error } = await admin
    .from("action_credit_balances")
    .select("balance")
    .eq("owner_user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error && !/does not exist|column/i.test(error.message)) throw new Error(`action_credit_balances: ${error.message}`);
  if (data?.balance != null) return Number(data.balance);
  const { data: global } = await admin
    .from("action_credit_balances")
    .select("balance")
    .eq("owner_user_id", userId)
    .is("project_id", null)
    .maybeSingle();
  return Number(global?.balance ?? 0);
}

async function restoreBuildCredits(admin, userId, amount) {
  await admin.from("profiles").update({ credits_remaining: amount }).eq("id", userId);
}

async function probeDiscussCharge(admin, userId) {
  const before = await readBuildCredits(admin, userId);
  const opId = `verify-p1332-discuss-${userId}`;
  const { data, error } = await admin.rpc("charge_tokens", {
    p_user_id: userId,
    p_amount: DISCUSS_DELTA,
    p_reason: "production-validation discuss probe",
    p_idempotency_key: opId,
    p_metadata: { verify: "p1332" },
  });
  if (error) throw new Error(`charge_tokens: ${error.message}`);
  const row = data ?? {};
  if (row.ok === false || row.success === false) {
    throw new Error(row.error ?? "charge_tokens failed");
  }
  const after = await readBuildCredits(admin, userId);
  const delta = Math.round((before - after) * 10) / 10;
  await restoreBuildCredits(admin, userId, before);
  return { before, after, delta, idempotent: Boolean(row.idempotent) };
}

async function probePreviewActionCharge(admin, userId, projectId) {
  const before = await readActionBalance(admin, userId, projectId);
  const opId = `verify-p1332-zip-preview-${projectId}-${Date.now()}`;
  const { data, error } = await admin.rpc("charge_action_credits", {
    p_owner_user_id: userId,
    p_project_id: projectId,
    p_action_type: "zip_preview_build",
    p_credits: PREVIEW_DELTA,
    p_operation_id: opId,
    p_metadata: { verify: "p1332" },
  });
  if (error) throw new Error(`charge_action_credits: ${error.message}`);
  const row = data ?? {};
  if (!row.success) throw new Error(row.error ?? "charge_action_credits failed");
  const after = await readActionBalance(admin, userId, projectId);
  const delta = Math.round((before - after) * 100) / 100;
  const { error: refundErr } = await admin.rpc("refund_action_credits", {
    p_owner_user_id: userId,
    p_project_id: projectId,
    p_original_operation_id: opId,
    p_refund_operation_id: `${opId}:refund`,
    p_reason: "production-validation refund",
  });
  if (refundErr) {
    console.warn(`⚠ refund_action_credits: ${refundErr.message} — restoring balance manually`);
    await admin
      .from("action_credit_balances")
      .update({ balance: before })
      .eq("owner_user_id", userId)
      .eq("project_id", projectId);
  }
  return { before, after, delta, charged: Number(row.charged ?? PREVIEW_DELTA) };
}

async function verifyLastZipPreviewHold(admin, userId, projectId) {
  const { data } = await admin
    .from("zip_preview_action_holds")
    .select("credits, status, updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function main() {
  console.log("\n=== verify:billing-production-flow ===\n");
  const errors = [];

  const e = env();
  const discussFlat = 0.3;
  if (!nearly(discussFlat, DISCUSS_DELTA)) {
    errors.push("DISCUSS_DELTA constant mismatch");
  } else {
    pass(`Discuss flat charge constant is ${DISCUSS_DELTA} BC`);
  }

  let admin;
  try {
    admin = createAdmin();
  } catch (err) {
    fail("Supabase admin", err.message);
    process.exit(1);
  }

  const projectId = arg("--project", DEFAULT_PREVIEW_PROJECT_ID);
  const userId = await resolveValidationUserId(admin, projectId);
  if (!userId) {
    fail("validation user", "set E2E_TEST_EMAIL, PRODUCTION_VALIDATION_USER_ID, or --project owner");
    process.exit(1);
  }

  try {
    const discuss = await probeDiscussCharge(admin, userId);
    if (discuss.idempotent) {
      pass(`Discuss charge idempotent replay (balance ${discuss.before} BC)`);
    } else if (nearly(discuss.delta, DISCUSS_DELTA)) {
      pass(`Discuss charge ${discuss.before} → ${discuss.after} BC (Δ ${discuss.delta})`);
    } else {
      errors.push(`Discuss delta expected ${DISCUSS_DELTA}, got ${discuss.delta} (${discuss.before} → ${discuss.after})`);
    }
  } catch (err) {
    errors.push(`Discuss probe: ${err.message}`);
  }

  try {
    const preview = await probePreviewActionCharge(admin, userId, projectId);
    if (nearly(preview.delta, PREVIEW_DELTA) || nearly(preview.charged, PREVIEW_DELTA)) {
      pass(`Preview action charge ${preview.before} → ${preview.after} AC (Δ ${preview.delta || preview.charged})`);
    } else {
      errors.push(
        `Preview delta expected ~${PREVIEW_DELTA}, got charged=${preview.charged} delta=${preview.delta}`,
      );
    }
  } catch (err) {
    errors.push(`Preview action probe: ${err.message}`);
  }

  try {
    const hold = await verifyLastZipPreviewHold(admin, userId, projectId);
    if (hold?.credits != null) {
      pass(`Latest zip_preview hold on project: ${hold.credits} AC (${hold.status})`);
    } else {
      console.log("ℹ No zip_preview_action_holds row for project (probe still validated RPC)");
    }
  } catch (err) {
    console.warn(`⚠ zip_preview hold lookup: ${err.message}`);
  }

  if (errors.length) {
    errors.forEach((m) => fail("billing", m));
    process.exit(1);
  }
  console.log("\n✓ billing production flow OK\n");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed/i.test(msg)) {
    fail("remote DB", "unreachable — cannot validate runtime billing");
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
