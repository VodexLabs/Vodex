#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const check = process.argv[2] ?? "all";
const errors = [];
const ok = [];

function must(cond, label) {
  if (cond) ok.push(label);
  else errors.push(label);
}

const partialLib = read("src/lib/billing/partial-build-credits.ts");
const reservations = read("src/lib/billing/credit-reservations.ts");
const preflight = read("src/lib/ai/preflight-server.ts");
const chat = read("src/app/api/chat/route.ts");
const execute = read("src/lib/build/execute-staged-build-job.ts");
const pipeline = read("src/lib/build/build-pipeline.ts");
const charge = read("src/lib/credits/charge-ai-operation.ts");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");
const progress = read("src/components/create/workspace/build-live-progress.tsx");
const summary = read("src/components/create/workspace/build-run-summary.tsx");

if (check === "all" || check === "partial-build-credits-starts-with-balance") {
  must(partialLib.includes("resolveBuildCreditAllowance"), "resolveBuildCreditAllowance");
  must(partialLib.includes("reserveAmount = Math.max(1, Math.min(available, quotedReserve)"), "reserve min(quoted,balance)");
  must(preflight.includes("resolveBuildCreditAllowance"), "preflight uses allowance");
  must(chat.includes("overrideReserveAmount"), "chat override reserve");
  must(!chat.includes("if (balance < tokensNeeded)") || chat.includes("!startBuildPipeline && balance < tokensNeeded"), "build not blocked by full quote");
}

if (check === "all" || check === "partial-build-stops-at-zero") {
  must(pipeline.includes("partial_credit_stop"), "pipeline partial_credit_stop");
  must(execute.includes("partialCreditStop"), "execute handles partial stop");
  must(partialLib.includes("workflowEventCreditStageCost"), "workflow stage costs");
}

if (check === "all" || check === "partial-build-saves-progress") {
  must(execute.includes("finalizeBuildPartial"), "finalizeBuildPartial wired");
  must(execute.includes("partial_needs_more_credits"), "partial terminal metadata");
}

if (check === "all" || check === "zero-build-credits-blocks") {
  must(reservations.includes("blocked_zero_credits"), "blocked_zero_credits code");
  must(partialLib.includes("blocked: true"), "zero balance blocked");
}

if (check === "all" || check === "atomic-action-credits-block-when-insufficient") {
  must(charge.includes("canAffordAtomicAction"), "atomic afford check");
  must(charge.includes("insufficient_action_credits"), "insufficient_action_credits");
}

if (check === "all" || check === "build-live-micro-events") {
  must(fs.existsSync(path.join(root, "src/lib/build/build-micro-events.ts")), "build-micro-events module");
  must(progress.includes("useEphemeralMicroStep"), "ephemeral micro steps in UI");
  must(progress.includes("pickEphemeralMicroStep"), "pickEphemeralMicroStep used");
}

if (check === "all" || check === "build-summary-card") {
  must(summary.includes("BuildRunSummaryCard"), "BuildRunSummaryCard");
  must(immersive.includes("build-run-summary"), "immersive shows summary");
}

if (check === "all" || check === "no-fake-success-on-partial-build") {
  must(summary.includes('variant === "partial"') || summary.includes("partial"), "partial variant");
  must(!summary.includes("Build complete") || summary.includes("Partial build saved"), "no-only success copy");
  must(execute.includes('event: "async_build_partial_credit_stop"'), "partial not logged as full success only");
}

if (check === "all" || check === "whole-app-user-facing-copy") {
  must(!immersive.includes("You're out of credits"), "no scary out-of-credits when partial");
  must(immersive.includes("Build Credits are used up"), "zero-credit copy");
}

if (check === "all" || check === "no-broken-help-docs") {
  const help = read("src/lib/help-markdown.ts");
  must(help.includes("renderHelpMarkdown"), "help markdown processor");
}

if (check === "all" || check === "no-dead-primary-buttons") {
  must(immersive.includes('data-testid="workspace-composer-textarea"'), "composer textarea test id");
}

if (check === "all" || check === "no-false-empty-states") {
  const projects = read("src/components/apps/projects-view.tsx");
  must(projects.includes("loading") || projects.includes("isLoading"), "projects loading guard");
}

if (check === "all" || check === "plan-permissions-consistent") {
  const picker = read("src/components/create/workspace/model-picker.tsx");
  must(picker.includes("plan") || picker.includes("Plan"), "model picker plan gate");
}

console.log(`\n=== verify:partial-build-credits (${check}) ===\n`);
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
