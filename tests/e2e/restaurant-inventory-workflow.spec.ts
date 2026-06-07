import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./helpers/live-gate";
import { appendTestEvidence } from "./helpers/evidence";
import { countProjects, waitForProjectIdAfterSubmit } from "./helpers/journey-api";
import { waitForCreatedProject } from "./helpers/wait-for-created-project";
import {
  countMissingRelativeImports,
  fetchProjectFiles,
  hasPlaceholderBlocker,
  diagnoseBuildTimeout,
  pollBuildComplete,
  type FailedStage,
  type RestaurantQaReport,
} from "./helpers/restaurant-qa";
import { writeBuildFailureSnapshot } from "./helpers/build-failure-snapshot";
import { writeBuildEventsFailureSnapshot } from "./helpers/build-events-failure-snapshot";
import { writeLiveGeneratedAppArtifact } from "./helpers/live-generated-app-artifact";
import { writeFinalBuildPipelineSnapshot } from "./helpers/final-build-pipeline-snapshot";
import { waitForBuildJobStarted } from "./helpers/wait-for-build-job";
import { classifyE2eFailureStage } from "./helpers/e2e-stage-classifier";
import {
  assertE2eAuthFromPreparedSession,
  assertE2eAuthInBrowserContext,
} from "./helpers/e2e-auth-probe";
import { writeRestaurantFinalFailure } from "./helpers/restaurant-final-failure";
import { assertPreviewRendered } from "./helpers/preview-render-check";
import {
  assertWorkspaceQueueComposerReady,
  openWorkspaceComposer,
  runQueueEightPlusOneTest,
} from "./helpers/queue-workspace";
import { classifyConsoleErrors } from "./helpers/console-error-classifier";
import { writeFinalRestaurantE2eFailure } from "./helpers/final-restaurant-e2e-failure";
import {
  assertCreateSubmitReady,
  readSubmitDiagnostics,
  visibleComposerTextarea,
  ensureBuildNowStrategy,
  visibleSubmitButton,
  waitForComposerReady,
} from "./helpers/create-submit-assert";
import { syncComposerTextarea } from "./helpers/sync-composer-textarea";
import { assertRestaurantBuildNowBeforeSubmit } from "./helpers/build-strategy-assert";
import {
  assertChatBuildNowPayload,
  CHAT_ENQUEUE_WAIT_MS,
  installChatEnqueueListener,
  writeChatEnqueueFailure,
} from "./helpers/chat-enqueue-assert";
import {
  GLOBAL_RESTAURANT_E2E_MAX_MS,
  STAGE_BUDGET_MS,
  StageWatchdog,
} from "./helpers/stage-watchdog";
import { clearStaleRestaurantE2eEvidence } from "./helpers/restaurant-evidence-cleanup";

import { RESTAURANT_PROMPT } from "./helpers/restaurant-prompt";

export { RESTAURANT_PROMPT };

const QA_REPORT_PATH = path.join(process.cwd(), "tests/e2e/evidence/restaurant-qa-report.json");
const REQUIRED_PAGES = ["inventory", "suppliers", "alerts", "settings"];
/** Align with stage watchdog `build_events` / `app_files` budget (180s). */
const BUILD_DEADLINE_MS = 180_000;

function writeQaReport(
  patch: Partial<RestaurantQaReport> & { startedAt: string },
  opts?: { fresh?: boolean; merge?: boolean },
) {
  const dir = path.dirname(QA_REPORT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  let cur: RestaurantQaReport = {
    startedAt: patch.startedAt,
    passed: false,
    errors: [],
    timings: {},
  };
  if (opts?.merge && fs.existsSync(QA_REPORT_PATH)) {
    try {
      cur = { ...cur, ...(JSON.parse(fs.readFileSync(QA_REPORT_PATH, "utf8")) as RestaurantQaReport) };
    } catch {
      /* fresh */
    }
  }
  const next: RestaurantQaReport = {
    ...cur,
    ...patch,
    errors: patch.errors ?? cur.errors,
    timings: { ...cur.timings, ...patch.timings },
  };
  fs.writeFileSync(QA_REPORT_PATH, JSON.stringify(next, null, 2));
  return next;
}

function failStage(report: RestaurantQaReport, stage: FailedStage, msg: string): RestaurantQaReport {
  report.failedStage = stage;
  report.errors.push(`${stage}:${msg}`);
  writeQaReport(report);
  return report;
}

test.describe("Restaurant inventory — structure", () => {
  test("post-build contract modules exist", async () => {
    const post = fs.readFileSync(path.join(process.cwd(), "src/lib/build/post-build-contract.ts"), "utf8");
    expect(post).toContain("enforcePostBuildContractWithRepair");
    expect(post).toContain("restaurant_inventory");
  });
});

test.describe("Restaurant inventory — @live workflow", () => {
  test.describe.configure({ mode: "serial", timeout: 600_000 });

  test("@live full restaurant inventory journey", async ({ page, request, liveGate }, testInfo) => {
    if (!liveGate) return;

    const t0 = Date.now();
    const watchdog = new StageWatchdog(t0);
    clearStaleRestaurantE2eEvidence();
    let report = writeQaReport({
      startedAt: new Date().toISOString(),
      passed: false,
      errors: [],
      timings: {},
    });

    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() < 500) return;
      const url = res.url();
      if (/\/api\/ai\/provider-status/i.test(url)) return;
      if (/\?_rsc=/i.test(url)) return;
      networkErrors.push(`${res.status()} ${url}`);
    });

    try {
      const reuseSessionAuth =
        process.env.E2E_SKIP_BROWSER_AUTH_PROBE === "1" ||
        process.env.E2E_AUTH_CHECK_PASSED === "1";
      watchdog.enter("auth");
      const authStart = Date.now();
      try {
        if (reuseSessionAuth) {
          const session = await assertE2eAuthFromPreparedSession(request);
          report.timings.authMs = Date.now() - authStart;
          report.authMode = "reuse_auth_check";
          report.authUserId = session.userId;
        } else {
          await assertE2eAuthInBrowserContext({ page, request });
          report.timings.authMs = Date.now() - authStart;
          report.authMode = "browser_probe";
        }
        watchdog.tick();
      } catch (authErr) {
        const code = authErr instanceof Error ? authErr.message : String(authErr);
        report.timings.authMs = Date.now() - authStart;
        failStage(report, "auth", code);
        throw new Error(code);
      }

      const beforeProjects = await countProjects(request, 30_000);

      watchdog.enter("create_interactive");
      const createStart = Date.now();
      await page.goto("/create?mode=build&strategy=build_now", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page
        .waitForFunction(
          () =>
            location.pathname.includes("/onboarding") ||
            Boolean(document.querySelector('[data-testid="builder-shell"]')),
          { timeout: 60_000 },
        )
        .catch(() => undefined);
      if (page.url().includes("/auth/login")) {
        failStage(report, "auth", "redirected_to_login");
        expect.soft(false, "auth session expired").toBeTruthy();
        return;
      }

      const textarea = visibleComposerTextarea(page);
      const submitBtn = visibleSubmitButton(page);
      const readyAt = Date.now();
      try {
        const readyWait = await waitForComposerReady(page, 90_000);
        if (readyWait.usedFallback) {
          report.errors.push("create_interactive:composer_ready_used_fallback");
        }
      } catch (err) {
        const diag = await readSubmitDiagnostics(page, textarea, submitBtn).catch(() => null);
        failStage(report, "create_interactive", `composer_not_ready: ${String(err)}`);
        console.error("[e2e] composer not ready", { url: page.url(), diag });
        await page.screenshot({ path: "tests/e2e/evidence/composer-not-ready.png", fullPage: true }).catch(() => {});
        throw err;
      }
      report.timings.composerReadyMs = Date.now() - readyAt;
      await expect(submitBtn).toHaveAttribute("data-disabled-reason", "empty", { timeout: 10_000 });
      report.timings.createInteractiveMs = Date.now() - createStart;

      await assertCreateSubmitReady(page, textarea, submitBtn, RESTAURANT_PROMPT, {
        skipComposerReadyWait: true,
      });
      await ensureBuildNowStrategy(page);

      watchdog.enter("build_strategy");
      const strategyState = await assertRestaurantBuildNowBeforeSubmit(
        page,
        RESTAURANT_PROMPT.length,
      );
      if (!strategyState.ok) {
        failStage(report, "build_strategy", "build_now not active before submit");
        expect(strategyState.ok).toBeTruthy();
        return;
      }

      const chatListener = installChatEnqueueListener(page);
      watchdog.enter("prompt_submit");
      await submitBtn.click();
      report.timings.afterSubmitMs = Date.now() - t0;

      watchdog.enter("chat_enqueue");
      let chatCapture;
      try {
        chatCapture = await chatListener.waitFor202(CHAT_ENQUEUE_WAIT_MS);
        assertChatBuildNowPayload(chatCapture);
      } catch (err) {
        writeChatEnqueueFailure(page, chatListener.getLast(), { error: String(err) });
        failStage(report, "chat_enqueue", String(err));
        expect(false, "POST /api/chat must return 202 with buildJobId").toBeTruthy();
        return;
      }

      const projectId =
        (typeof chatCapture.body.projectId === "string" && chatCapture.body.projectId) ||
        (await waitForProjectIdAfterSubmit(page, request, beforeProjects, 45_000));
      if (!projectId) {
        failStage(report, "project_create", "no projectId after submit");
        expect(projectId).toBeTruthy();
        return;
      }
      report.projectId = projectId;
      report.buildJobId = String(chatCapture.body.buildJobId ?? "");

      watchdog.enter("first_build_event");
      const jobStart = await waitForBuildJobStarted(request, projectId, 30_000);
      watchdog.tick();
      if (!jobStart.jobId) {
        await writeFinalBuildPipelineSnapshot(request, projectId, report.buildJobId).catch(
          () => undefined,
        );
        failStage(report, "build_events", "build_job_never_started after 202 enqueue");
        expect(jobStart.jobId).toBeTruthy();
        return;
      }
      report.buildJobId = jobStart.jobId;
      watchdog.enter("build_events");

      let createProof;
      try {
        createProof = await waitForCreatedProject(page, request, {
          projectId,
          beforeListCount: beforeProjects,
          listRetryMs: 45_000,
          authUserId: report.authUserId,
        });
      } catch (err) {
        failStage(report, "project_create", String(err));
        throw err;
      }
      if (createProof.listCountStale) {
        report.errors.push("project_create:PROJECT_LIST_COUNT_STALE");
      }
      report.timings.builderOpenMs = Date.now() - t0;
      report.projectListVisible = createProof.listVisible;

      await page.screenshot({ path: testInfo.outputPath("01-builder.png"), fullPage: true }).catch(() => undefined);

      const buildPoll = await pollBuildComplete(request, projectId, BUILD_DEADLINE_MS, {
        shouldAbort: () => {
          watchdog.tick();
          return watchdog.elapsedMs() >= GLOBAL_RESTAURANT_E2E_MAX_MS;
        },
      });
      watchdog.tick();
      report.buildJobId = buildPoll.jobId ?? undefined;
      report.timings.buildWaitMs = Date.now() - t0;

      if (buildPoll.progressMax <= 0) {
        await writeFinalBuildPipelineSnapshot(request, projectId, buildPoll.jobId).catch(
          () => undefined,
        );
        failStage(report, "build_events", "progress never moved above 0");
      }
      if (!buildPoll.done) {
        const eventJoined = buildPoll.events.join(" ");
        for (const token of ["plan", "identity", "writ", "quality", "preview", "understanding"]) {
          if (!eventJoined.includes(token) && !eventJoined.includes("planning")) {
            report.errors.push(`build_events:missing_${token}`);
          }
        }
      }
      if (!buildPoll.done) {
        await writeFinalBuildPipelineSnapshot(request, projectId, buildPoll.jobId).catch(
          () => undefined,
        );
        await writeBuildEventsFailureSnapshot(request, projectId, buildPoll.jobId).catch(() => undefined);
        await writeBuildFailureSnapshot(request, projectId, buildPoll.jobId).catch(() => undefined);
        await writeLiveGeneratedAppArtifact(request, {
          projectId,
          buildJobId: buildPoll.jobId ?? null,
          pass: false,
          failureKind: "build_timeout",
          failureDetail: buildPoll.events.slice(-5).join(" "),
        }).catch(() => undefined);
        const diag = await diagnoseBuildTimeout(
          request,
          projectId,
          buildPoll.jobId,
          buildPoll.events,
        );
        const summaryRes = await request.get(`/api/projects/${projectId}/summary`);
        const summaryBody = summaryRes.ok() ? await summaryRes.json() : {};
        const projEarly = summaryBody.project ?? summaryBody;
        const classified = classifyE2eFailureStage({
          events: buildPoll.events,
          filesCount: buildPoll.filesCount,
          buildStatus: projEarly.build_status ?? null,
          previewUrl: projEarly.preview_url ?? null,
          diag,
        });
        const failAs: FailedStage =
          classified === "generated_files" ||
          classified === "import_graph" ||
          classified === "ui_quality"
            ? classified
            : classified === "preview" ||
                classified === "publish" ||
                classified === "dashboard_unlock"
              ? "preview"
              : "build_events";
        const race = buildPoll.raceDetected ? " race_detected=failed_then_running" : "";
        const files = buildPoll.filesCount != null ? ` files=${buildPoll.filesCount}` : "";
        failStage(
          report,
          failAs,
          `build did not complete in time — ${diag}${race}${files}`,
        );
        const filesKept = (buildPoll.filesCount ?? 0) > 0 && failAs === "preview";
        if (!filesKept) {
          expect(buildPoll.done).toBeTruthy();
          return;
        }
      }

      const summaryRes = await request.get(`/api/projects/${projectId}/summary`);
      const summary = summaryRes.ok() ? await summaryRes.json() : {};
      const proj = summary.project ?? summary;
      report.appName = proj.app_name ?? proj.name;
      report.logoStatus = proj.icon_url ? "icon_url" : proj.metadata?.icon_fallback_reason ?? "unknown";
      report.uiQualityScore =
        proj.metadata?.ui_quality_score ?? summary.metadata?.ui_quality_score ?? undefined;

      if (report.appName) {
        expect(report.appName.toLowerCase()).not.toContain("untitled");
        expect(report.appName.length).toBeLessThan(RESTAURANT_PROMPT.length / 2);
      } else {
        failStage(report, "build_events", "missing app name");
      }

      watchdog.enter("app_files");
      const filesResult = await fetchProjectFiles(request, projectId);
      watchdog.tick();
      if (!filesResult.ok) {
        failStage(report, "generated_files", "could not fetch files");
        return;
      }
      report.fileCount = filesResult.files.length;
      const pathsLower = filesResult.files
        .map((f: { path: string }) => f.path.toLowerCase())
        .join("\n");
      for (const slug of REQUIRED_PAGES) {
        if (!pathsLower.includes(slug)) report.errors.push(`generated_files:missing_page_${slug}`);
      }
      const componentPaths = filesResult.files.filter((f: { path: string }) =>
        /(^|\/)components\//i.test(f.path.replace(/\\/g, "/")),
      );
      report.componentCount = componentPaths.length;
      if (componentPaths.length < 5) {
        report.errors.push(`generated_files:components_${componentPaths.length}_lt_5`);
      }

      const missing = countMissingRelativeImports(filesResult.files);
      report.missingImports = missing;
      report.importGraphOk = missing.length === 0;
      if (missing.length) failStage(report, "import_graph", missing.slice(0, 3).join("; "));

      if (hasPlaceholderBlocker(filesResult.files)) {
        failStage(report, "generated_files", "placeholder/TODO content in generated files");
      }

      if (report.uiQualityScore != null && report.uiQualityScore < 85) {
        failStage(report, "ui_quality", `score_${report.uiQualityScore}_lt_85`);
      }

      watchdog.enter("preview");
      const previewStartedAt = Date.now();
      const previewCheck = await assertPreviewRendered(
        page,
        request,
        projectId,
        buildPoll.jobId ?? report.buildJobId ?? null,
        consoleErrors,
        networkErrors,
        {
          stageStartedAt: previewStartedAt,
          previewBudgetMs: STAGE_BUDGET_MS.preview - 1_000,
        },
      );
      report.previewOk = previewCheck.ok;
      if (previewCheck.ok) {
        await writeLiveGeneratedAppArtifact(request, {
          projectId,
          buildJobId: buildPoll.jobId ?? report.buildJobId ?? null,
          pass: true,
          previewSessionId: previewCheck.previewSessionId ?? null,
        }).catch(() => undefined);
      }
      if (!previewCheck.ok) {
        failStage(report, "preview", previewCheck.rootCause);
        writeFinalRestaurantE2eFailure({
          stage: "preview",
          elapsed_ms: Date.now() - t0,
          stage_elapsed_ms: Date.now() - previewStartedAt,
          url: page.isClosed() ? null : page.url(),
          project_id: projectId,
          build_job_id: buildPoll.jobId ?? report.buildJobId,
          app_files_count: report.fileCount,
          preview_session_id: previewCheck.previewSessionId,
          preview_root_marker_status: false,
          root_cause: previewCheck.rootCause,
          evidence_file: "tests/e2e/evidence/preview-render-failure.json",
          errors: report.errors,
        });
        await page
          .screenshot({ path: testInfo.outputPath("02-preview.png"), fullPage: true })
          .catch(() => undefined);
        writeQaReport(report);
        throw new Error(`preview:${previewCheck.rootCause}`);
      }
      watchdog.tick();
      await page.screenshot({ path: testInfo.outputPath("02-preview.png"), fullPage: true }).catch(() => undefined);

      if (process.env.E2E_GENERATED_APP_PROOF_ONLY === "1") {
        report.passed = report.errors.length === 0;
        report.finishedAt = new Date().toISOString();
        report.timings.totalMs = Date.now() - t0;
        writeQaReport(report);
        await writeLiveGeneratedAppArtifact(request, {
          projectId,
          buildJobId: buildPoll.jobId ?? report.buildJobId ?? null,
          pass: true,
          previewSessionId: previewCheck.previewSessionId ?? null,
        }).catch(() => undefined);
        expect(report.errors).toHaveLength(0);
        return;
      }

      watchdog.enter("queue");
      if (process.env.E2E_SKIP_INLINE_QUEUE === "1") {
        report.queueTestOk = true;
        report.queueVerifiedVia = "queue_only_spec";
      } else {
        const queueComposer = await openWorkspaceComposer(page, projectId);
        await assertWorkspaceQueueComposerReady(page, projectId, queueComposer);
        const queueResult = await runQueueEightPlusOneTest(page, projectId, queueComposer);
        report.queueTestOk = queueResult.ok;
        if (!queueResult.ok) {
          failStage(report, "queue", "queue:8plus1_or_empty_or_dup");
          report.errors.push("queue:8plus1_or_empty_or_dup");
        }
      }
      watchdog.tick();

      watchdog.enter("publish");
      const publishRes = await request.post(`/api/projects/${projectId}/publish`, { data: {} });
      watchdog.tick();
      if (!publishRes.ok()) {
        const pubErr = await publishRes.json().catch(() => ({}));
        const reason =
          pubErr.code && pubErr.message
            ? `${pubErr.code}:${pubErr.message}`
            : pubErr.error
              ? String(pubErr.error)
              : `HTTP ${publishRes.status()}`;
        failStage(report, "publish", reason);
      } else {
        const pub = await publishRes.json();
        report.publishUrl = pub.publicUrl ?? pub.public_url ?? pub.url;
        if (report.publishUrl) {
          const pubPage = await request.get(report.publishUrl);
          if (!pubPage.ok()) report.errors.push(`publish:url_${pubPage.status()}`);
        }
      }

      watchdog.enter("dashboard_unlock");
      await page.goto(`/apps/${projectId}/dashboard`, {
        timeout: 60_000,
        waitUntil: "domcontentloaded",
      });
      watchdog.tick();
      const locked = page.getByText(/locked|publish to unlock/i).first();
      const overview = page.getByRole("heading", { name: /overview/i }).first();
      await overview.waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
      const unlocked = await overview.isVisible().catch(() => false);
      if (!unlocked && (await locked.isVisible().catch(() => false))) {
        report.errors.push("dashboard_unlock:still_locked");
      }

      watchdog.enter("payments");
      const paymentsLink = page.getByRole("link", { name: /payments/i }).or(page.getByRole("tab", { name: /payments/i }));
      if (await paymentsLink.first().isVisible().catch(() => false)) {
        await paymentsLink.first().click();
        await page.waitForTimeout(2_000);
        const bodyText = await page.locator("body").innerText();
        report.paymentsTabOk =
          !bodyText.includes("Unexpected token") && !/SyntaxError.*JSON/i.test(bodyText);
        if (!report.paymentsTabOk) failStage(report, "payments", "json_crash");
      }

      watchdog.tick();
      watchdog.enter("analytics");
      const analyticsLink = page.getByRole("link", { name: /analytics/i }).or(page.getByRole("tab", { name: /analytics/i }));
      if (await analyticsLink.first().isVisible().catch(() => false)) {
        await analyticsLink.first().click({ timeout: 90_000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
        report.analyticsOk = true;
      }

      const { unclassified: unclassifiedConsole } = classifyConsoleErrors(consoleErrors);
      if (unclassifiedConsole.length) {
        report.errors.push(`console_errors:${unclassifiedConsole.length}`);
      }
      if (networkErrors.length) report.errors.push(`network_5xx:${networkErrors.slice(0, 3).join("|")}`);

      report.passed = report.errors.length === 0;
      report.finishedAt = new Date().toISOString();
      report.timings.totalMs = Date.now() - t0;
      writeQaReport(report);

      await writeLiveGeneratedAppArtifact(request, {
        projectId,
        buildJobId: buildPoll.jobId ?? report.buildJobId ?? null,
        pass: report.passed,
        previewSessionId: previewCheck.previewSessionId ?? null,
        publishUrl: report.publishUrl ?? null,
      }).catch(() => undefined);

      if (!report.passed) {
        writeFinalRestaurantE2eFailure({
          stage: report.failedStage ?? "unknown",
          url: page.url(),
          project_id: report.projectId,
          build_job_id: report.buildJobId,
          app_files_count: report.fileCount,
          preview_ok: report.previewOk,
          publish_url: report.publishUrl,
          queue_test_ok: report.queueTestOk,
          errors: report.errors,
        });
      }

      await page.screenshot({ path: testInfo.outputPath("03-final.png"), fullPage: true }).catch(() => undefined);

      appendTestEvidence({
        name: "restaurant inventory workflow",
        passed: report.passed,
        projectId: report.projectId,
        publishedSlug: report.publishUrl,
        screenshot: testInfo.outputPath("03-final.png"),
        timestamp: report.finishedAt!,
        error: report.errors.join("; ") || undefined,
      });

      expect(report.errors, report.failedStage ?? report.errors.join("; ")).toHaveLength(0);
    } catch (err) {
      report.finishedAt = new Date().toISOString();
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push(msg);
      const watchdogStage = msg.match(/^([a-z_]+):/)?.[1];
      if (watchdogStage && !report.failedStage) {
        report.failedStage = watchdogStage as FailedStage;
      }
      if (!report.failedStage) {
        if (msg.includes("composer-prompt-queue") || msg.includes("builder-shell")) {
          report.failedStage = "queue";
        } else if (msg.includes("preview:")) {
          report.failedStage = "preview";
        } else {
          report.failedStage = msg.includes("E2E_AUTH") ? "auth" : "build_events";
        }
      }
      writeFinalRestaurantE2eFailure({
        stage: report.failedStage ?? watchdog.current(),
        message: msg,
        elapsed_ms: Date.now() - t0,
        project_id: report.projectId ?? null,
        build_job_id: report.buildJobId ?? null,
        evidence_file: "tests/e2e/evidence/final-restaurant-e2e-failure.json",
        errors: report.errors,
      });
      await writeRestaurantFinalFailure({
        stage: report.failedStage ?? "build_events",
        message: msg,
        url: page.url(),
        projectId: report.projectId,
        buildJobId: report.buildJobId,
        fileCount: report.fileCount,
        consoleErrors: consoleErrors.slice(0, 20),
        networkErrors: networkErrors.slice(0, 20),
        page,
      }).catch(() => undefined);
      writeQaReport(report);
      throw err;
    }
  });
});
