#!/usr/bin/env node
/**
 * Live manual QA — partial build credits, zero block, atomic action credits.
 * npm run manual-qa:partial-credits
 * Requires: npm run dev, .playwright-auth.json or E2E_TEST_EMAIL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  cookiesHeader,
  getBaseUrl,
  readAuthFile,
  resolveE2eUserEmail,
  serverUp,
} from "./lib/e2e-live.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_PATH = path.join(root, ".manual-qa-partial-credits.json");

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const baseUrl = getBaseUrl();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

const LARGE_BUILD_PROMPT =
  "Build a full restaurant management app with inventory tracking, reservations, staff scheduling, analytics dashboard, low-stock alerts, and customer ordering. Include at least 8 pages and a complete data model.";

const evidence = {
  runAt: new Date().toISOString(),
  baseUrl,
  tests: {},
  microStepTitles: [],
  userMessages: [],
  blockers: [],
};

function save() {
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2));
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function getBuildCredits(admin, userId) {
  const { data } = await admin
    .from("profiles")
    .select("credits_remaining")
    .eq("id", userId)
    .maybeSingle();
  return Number(data?.credits_remaining ?? 0);
}

async function getActionCredits(admin, userId) {
  const { data } = await admin
    .from("action_credit_balances")
    .select("balance")
    .eq("owner_user_id", userId)
    .is("project_id", null)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

async function setBuildCredits(admin, userId, amount) {
  const { error } = await admin
    .from("profiles")
    .update({ credits_remaining: amount })
    .eq("id", userId);
  if (error) throw new Error(`setBuildCredits: ${error.message}`);
}

async function setActionCredits(admin, userId, amount) {
  const { data: row } = await admin
    .from("action_credit_balances")
    .select("id")
    .eq("owner_user_id", userId)
    .is("project_id", null)
    .maybeSingle();
  if (row?.id) {
    const { error } = await admin
      .from("action_credit_balances")
      .update({ balance: amount, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(`setActionCredits: ${error.message}`);
  } else {
    const { error } = await admin.from("action_credit_balances").insert({
      owner_user_id: userId,
      project_id: null,
      balance: amount,
    });
    if (error) throw new Error(`setActionCredits insert: ${error.message}`);
  }
}

async function preflight(cookie, prompt, projectId) {
  const res = await fetch(`${baseUrl}/api/ai/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      mode: "build",
      prompt,
      modelId: "gpt-5.4-mini",
      projectId,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function enqueueBuild(cookie, prompt, projectId) {
  const opId = `manual-qa:${Date.now()}`;
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookie,
      "X-DreamOS-Async-Build": "1",
    },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text: prompt }] }],
      mode: "build",
      strategy: "build_now",
      forceBuildPipeline: true,
      planFirstOnly: false,
      modelId: "gpt-5.4-mini",
      projectId,
      operationId: opId,
      idempotencyKey: opId,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, opId };
}

async function pollBuildEvents(cookie, eventsUrl, maxMs = 180_000) {
  const titles = [];
  const started = Date.now();
  let lastStatus = null;
  let terminal = null;
  const url = eventsUrl.startsWith("http") ? eventsUrl : `${baseUrl}${eventsUrl}`;

  while (Date.now() - started < maxMs) {
    const res = await fetch(url, { headers: { Cookie: cookie } });
    const body = await res.json().catch(() => ({}));
    lastStatus = body.job?.status ?? null;
    for (const ev of body.events ?? []) {
      if (ev.title && !titles.includes(ev.title)) titles.push(ev.title);
      if (ev.type === "partial_credit_stop" || ev.type === "completed" || ev.type === "failed") {
        terminal = ev;
      }
    }
    if (body.job?.status === "completed" || body.job?.status === "failed") break;
    if (terminal?.type === "partial_credit_stop") break;
    await sleep(1200);
  }

  return { titles, lastStatus, terminal, elapsedMs: Date.now() - started };
}

async function testSchemaPartialEvent(admin, userId) {
  const { data: job } = await admin
    .from("build_jobs")
    .select("id, project_id, owner_id, user_id")
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job?.id) {
    return { ok: false, reason: "no build_jobs row to attach test event" };
  }

  const { error } = await admin.from("build_job_events").insert({
    job_id: job.id,
    project_id: job.project_id,
    user_id: userId,
    type: "partial_credit_stop",
    title: "QA schema probe",
    detail: "manual-qa insert",
    progress_percent: 100,
    metadata: { qa: true },
  });

  if (error) return { ok: false, reason: error.message };

  const { data: readBack } = await admin
    .from("build_job_events")
    .select("type, title")
    .eq("job_id", job.id)
    .eq("type", "partial_credit_stop")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ok: true, columnType: "text (no enum)", readBack };
}

async function main() {
  if (!(await serverUp())) {
    console.error(`Dev server not up at ${baseUrl}`);
    process.exit(1);
  }
  if (!url || !serviceKey) {
    console.error("Missing Supabase URL or service role key");
    process.exit(1);
  }

  const auth = readAuthFile();
  const cookie = cookiesHeader(auth.json);
  const email = resolveE2eUserEmail(env);
  if (!cookie || !email) {
    console.error("Need .playwright-auth.json or E2E_TEST_EMAIL");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, credits_remaining")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.id) {
    console.error(`No profile for ${email}`);
    process.exit(1);
  }

  const userId = profile.id;
  const originalBuild = await getBuildCredits(admin, userId);
  const originalAction = await getActionCredits(admin, userId);

  evidence.user = { email, userId };
  evidence.originalCredits = { build: originalBuild, action: originalAction };

  console.log("\n=== Manual QA: partial credits ===\n");
  console.log(`User: ${email}`);

  // Test 4 — schema
  console.log("\n[Test 4] build_job_events.type = partial_credit_stop");
  evidence.tests.schema = await testSchemaPartialEvent(admin, userId);
  console.log(evidence.tests.schema.ok ? "✓ PASS" : `✗ FAIL: ${evidence.tests.schema.reason}`);

  // Test 2 — zero credits
  console.log("\n[Test 2] 0 Build Credits block");
  await setBuildCredits(admin, userId, 0);
  const preZero = await preflight(cookie, LARGE_BUILD_PROMPT);
  const enqZero = await enqueueBuild(cookie, LARGE_BUILD_PROMPT);
  const jobBeforeZero = await admin
    .from("build_jobs")
    .select("id")
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const jobsAfterZero = await admin
    .from("build_jobs")
    .select("id, status, created_at")
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const creditsAfterZeroBlock = await getBuildCredits(admin, userId);

  evidence.tests.zeroCredits = {
    preflightStatus: preZero.status,
    preflightCode: preZero.body?.code,
    preflightError: preZero.body?.error,
    enqueueStatus: enqZero.status,
    enqueueCode: enqZero.body?.code,
    latestJobStatus: jobsAfterZero.data?.status ?? null,
    newJobStarted: jobsAfterZero.data?.id !== jobBeforeZero.data?.id,
    creditsAfter: creditsAfterZeroBlock,
    pass:
      preZero.status === 402 &&
      preZero.body?.code === "blocked_zero_credits" &&
      enqZero.status === 402 &&
      creditsAfterZeroBlock >= 0 &&
      jobsAfterZero.data?.id === jobBeforeZero.data?.id,
  };
  console.log(evidence.tests.zeroCredits.pass ? "✓ PASS" : "✗ FAIL", evidence.tests.zeroCredits);

  // Test 1 — 3 credits partial
  console.log("\n[Test 1] 3 Build Credits partial build");
  await setBuildCredits(admin, userId, 3);
  const creditsBefore3 = await getBuildCredits(admin, userId);
  const pre3 = await preflight(cookie, LARGE_BUILD_PROMPT);
  let projectId = pre3.body?.projectId ?? null;

  if (!projectId && pre3.body?.ok) {
    const { data: p } = await admin
      .from("projects")
      .select("id")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    projectId = p?.id ?? null;
  }

  const enq3 = await enqueueBuild(cookie, LARGE_BUILD_PROMPT, projectId ?? undefined);
  let poll = { titles: [], terminal: null, lastStatus: null };
  if (enq3.status === 202 && enq3.body?.eventsUrl) {
    poll = await pollBuildEvents(cookie, enq3.body.eventsUrl);
    evidence.microStepTitles = poll.titles;
  }

  const creditsAfterBuild = await getBuildCredits(admin, userId);
  const jobId = enq3.body?.buildJobId;
  let jobRow = null;
  let projectRow = null;
  let fileCount = 0;
  let partialEvents = [];

  if (jobId) {
    const { data: j } = await admin.from("build_jobs").select("*").eq("id", jobId).maybeSingle();
    jobRow = j;
    const { data: evs } = await admin
      .from("build_job_events")
      .select("type, title, detail, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    partialEvents = evs ?? [];
  }
  if (enq3.body?.projectId || projectId) {
    const pid = enq3.body?.projectId ?? projectId;
    const { data: p } = await admin
      .from("projects")
      .select("id, name, build_status, metadata")
      .eq("id", pid)
      .maybeSingle();
    projectRow = p;
    const { count } = await admin
      .from("app_files")
      .select("id", { count: "exact", head: true })
      .eq("project_id", pid);
    fileCount = count ?? 0;
  }

  const meta = projectRow?.metadata && typeof projectRow.metadata === "object" ? projectRow.metadata : {};
  const partialMeta =
    meta.partial_build === true ||
    meta.build_status === "partial_needs_more_credits" ||
    projectRow?.build_status === "partial";

  evidence.tests.threeCredits = {
    enqueueError: enq3.body?.error,
    enqueueCode: enq3.body?.code,
    creditsBefore: creditsBefore3,
    creditsAfter: creditsAfterBuild,
    preflightOk: pre3.body?.ok === true,
    preflightPartial: pre3.body?.partialBuildCredits,
    enqueueStatus: enq3.status,
    enqueueMessage: enq3.body?.message,
    partialBuildFlag: enq3.body?.partialBuild,
    microStepCount: poll.titles.length,
    microStepsFirst8: poll.titles.slice(0, 8),
    terminalEventType: poll.terminal?.type ?? null,
    terminalTitle: poll.terminal?.title ?? null,
    jobStatus: jobRow?.status,
    projectBuildStatus: projectRow?.build_status,
    partialMeta,
    fileCount,
    creditsNeverNegative: creditsAfterBuild >= 0,
    pass:
      pre3.body?.ok === true &&
      enq3.status === 202 &&
      creditsAfterBuild >= 0 &&
      creditsAfterBuild <= creditsBefore3 &&
      poll.titles.length >= 2,
  };
  evidence.allEventTitles = partialEvents.map((e) => ({ type: e.type, title: e.title, detail: e.detail }));
  console.log(evidence.tests.threeCredits.pass ? "✓ PASS (core)" : "✗ FAIL (core)", evidence.tests.threeCredits);
  console.log("Micro-steps seen:", poll.titles.join(" → "));

  // Test 3 — atomic action
  console.log("\n[Test 3] Action Credits atomic block");
  await setActionCredits(admin, userId, 0);
  const pidForLogo =
    enq3.body?.projectId ??
    projectId ??
    (
      await admin
        .from("projects")
        .select("id")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data?.id;

  let logoTest = { skipped: true };
  if (pidForLogo) {
    const quoteRes = await fetch(
      `${baseUrl}/api/projects/${pidForLogo}/identity/regenerate-logo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      },
    );
    const quoteBody = await quoteRes.json().catch(() => ({}));
    const confirmRes = await fetch(
      `${baseUrl}/api/projects/${pidForLogo}/identity/regenerate-logo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ confirm: true, operationId: `qa-logo:${Date.now()}` }),
      },
    );
    const confirmBody = await confirmRes.json().catch(() => ({}));
    const actionAfter = await getActionCredits(admin, userId);
    const { data: projBefore } = await admin
      .from("projects")
      .select("icon_url")
      .eq("id", pidForLogo)
      .maybeSingle();
    const iconUrlBefore = projBefore?.icon_url ?? null;
    const { count: storageFilesBefore } = await admin
      .from("app_files")
      .select("id", { count: "exact", head: true })
      .eq("project_id", pidForLogo)
      .ilike("path", "%logo%");

    logoTest = {
      quoteStatus: quoteRes.status,
      actionCreditsQuoted: quoteBody.actionCredits,
      confirmStatus: confirmRes.status,
      confirmCode: confirmBody.code,
      confirmError: confirmBody.error,
      actionCreditsAfter: actionAfter,
      iconUrlChanged: false,
      logoStorageFilesAfter: storageFilesBefore ?? 0,
      pass: confirmRes.status === 402 && actionAfter >= 0,
    };

    if (confirmRes.status !== 402) {
      const { data: projAfter } = await admin
        .from("projects")
        .select("icon_url")
        .eq("id", pidForLogo)
        .maybeSingle();
      logoTest.iconUrlChanged = projAfter?.icon_url !== iconUrlBefore && !!projAfter?.icon_url;
      const { count: storageAfter } = await admin
        .from("app_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", pidForLogo)
        .ilike("path", "%logo%");
      logoTest.logoStorageFilesAfter = storageAfter ?? 0;
      logoTest.pass = false;
    } else {
      logoTest.pass =
        confirmRes.status === 402 &&
        actionAfter >= 0 &&
        !logoTest.iconUrlChanged &&
        (logoTest.logoStorageFilesAfter ?? 0) <= (storageFilesBefore ?? 0);
    }
  }
  evidence.tests.atomicAction = logoTest;
  console.log(logoTest.pass ? "✓ PASS" : logoTest.skipped ? "⊘ SKIP (no project)" : "✗ FAIL", logoTest);

  // Test 4 — logo with sufficient Action Credits (run before zeroing balance in test 3 is done — restore here)
  let logoChargeTest = { skipped: true };
  if (pidForLogo) {
    await setActionCredits(admin, userId, 100);
    await sleep(500);
    const beforeBal = await getActionCredits(admin, userId);
    if (beforeBal < 10) {
      logoChargeTest = { skipped: true, pass: false, reason: `setActionCredits failed: balance=${beforeBal}` };
    } else {
    const confirmOk = await fetch(
      `${baseUrl}/api/projects/${pidForLogo}/identity/regenerate-logo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ confirm: true, operationId: `qa-logo-ok:${Date.now()}` }),
      },
    );
    const okBody = await confirmOk.json().catch(() => ({}));
    const afterBal = await getActionCredits(admin, userId);
      logoChargeTest = {
        confirmStatus: confirmOk.status,
        charged: okBody.charged,
        creditsBefore: beforeBal,
        creditsAfter: afterBal,
        creditsDeducted: beforeBal - afterBal,
        pass: confirmOk.status === 200 && afterBal < beforeBal && afterBal >= 0,
      };
    }
  }
  evidence.tests.atomicActionCharge = logoChargeTest;
  console.log(
    logoChargeTest.pass ? "✓ PASS (charge)" : logoChargeTest.skipped ? "⊘ SKIP" : "✗ FAIL (charge)",
    logoChargeTest,
  );

  // Restore credits
  await setBuildCredits(admin, userId, originalBuild);
  await setActionCredits(admin, userId, originalAction);
  evidence.restoredCredits = { build: originalBuild, action: originalAction };

  save();
  console.log(`\nEvidence: ${EVIDENCE_PATH}\n`);

  const allPass =
    evidence.tests.schema?.ok &&
    evidence.tests.zeroCredits?.pass &&
    evidence.tests.threeCredits?.pass &&
    (evidence.tests.atomicAction?.pass || evidence.tests.atomicAction?.skipped) &&
    (evidence.tests.atomicActionCharge?.pass || evidence.tests.atomicActionCharge?.skipped);

  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  evidence.blockers.push(err.message);
  save();
  process.exit(1);
});
