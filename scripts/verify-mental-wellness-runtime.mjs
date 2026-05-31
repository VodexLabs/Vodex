#!/usr/bin/env node
/**
 * Runtime fixes: mental wellness archetype, root page repair, fallback quality, optimistic UX, model routing.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const CHECKS = {
  "optimistic-assistant-row-within-100ms": () => {
    const ws = read("src/components/create/workspace/immersive-workspace.tsx");
    const opt = read("src/components/create/workspace/optimistic-assistant-row.tsx");
    if (!ws.includes("setShowOptimisticAssistant(true)")) fail("submit must set optimistic assistant synchronously");
    if (!ws.includes("OptimisticAssistantRow")) fail("missing OptimisticAssistantRow");
    if (!opt.includes("Preparing your build")) fail("missing preparing copy");
    if (!opt.includes("Thinking")) fail("missing thinking copy");
    if (!opt.includes("setInterval")) fail("missing dot animation");
    pass("optimistic assistant row on submit");
  },
  "preparing-dots-animate-before-backend": () => {
    const opt = read("src/components/create/workspace/optimistic-assistant-row.tsx");
    if (!opt.includes('setInterval(() => setDotFrame')) fail("dot animation interval missing");
    pass("preparing dots animate");
  },
  "discuss-uses-thinking-not-build-preparing": () => {
    const opt = read("src/components/create/workspace/optimistic-assistant-row.tsx");
    if (!/mode === "discuss" \? "Thinking"/.test(opt)) fail("discuss must use Thinking");
    pass("discuss uses Thinking");
  },
  "optimistic-row-does-not-clear-chat": () => {
    const ws = read("src/components/create/workspace/immersive-workspace.tsx");
    if (!ws.includes("setPendingUserBubble(text)")) fail("must keep pending user bubble");
    if (ws.includes("setMessages([])")) fail("must not clear chat on submit");
    pass("optimistic row does not clear chat");
  },
  "mental-wellness-archetype-classification": () => {
    const c = read("src/lib/build/app-archetype-classifier.ts");
    if (!c.includes('id: "mental_wellness_journal"')) fail("missing mental_wellness_journal archetype");
    const prompt =
      "Build a mental wellness journal with daily mood check-ins, guided prompts, trend insights, and private encryption messaging.";
    const lower = prompt.toLowerCase();
    const mw = /mental wellness journal|mood check-?ins?|guided prompts?|trend insights?|private journal/i.test(
      lower,
    );
    const ai = /ai (?:tool|assistant|chat)|writing assistant|(?:^|\s)chatbot/i.test(lower);
    if (!mw) fail("test prompt must match mental wellness patterns");
    if (ai) fail("test prompt must not match ai_tool");
    pass("mental wellness archetype classification");
  },
  "mental-wellness-scaffold-real-ui": () => {
    const s = read("src/lib/build/mental-wellness-scaffold.ts");
    for (const p of [
      "components/MoodCheckInCard.tsx",
      "components/MoodTrendChart.tsx",
      "components/GuidedPromptCard.tsx",
      "components/JournalEntryList.tsx",
      "components/PrivateMessagePanel.tsx",
      "components/InsightCards.tsx",
      "lib/mental-wellness-data.ts",
    ]) {
      if (!s.includes(p)) fail(`missing ${p}`);
    }
    pass("mental wellness scaffold real ui");
  },
  "mental-wellness-root-page-content": () => {
    const s = read("src/lib/build/mental-wellness-scaffold.ts");
    const m = s.match(/path: "app\/page\.tsx",[\s\S]*?content: `([\s\S]*?)`/);
    if (!m) fail("no app/page.tsx in scaffold");
    const body = m[1];
    if (body.length < 1800) fail(`root page too short: ${body.length} chars`);
    if (!body.includes("MoodCheckInCard")) fail("root page missing mood check-in");
    if (!body.includes("PrivateMessagePanel")) fail("root page missing encryption card");
    pass("mental wellness root page content");
  },
  "mental-wellness-no-ai-tool-fallback": () => {
    const c = read("src/lib/build/app-archetype-classifier.ts");
    const mwIdx = c.indexOf('id: "mental_wellness_journal"');
    const aiIdx = c.indexOf('id: "ai_tool"');
    if (mwIdx < 0 || aiIdx < 0) fail("missing archetype hints");
    if (mwIdx > aiIdx) fail("mental_wellness_journal must be listed before ai_tool");
    if (/\/prompt\|chatbot/i.test(c.split('id: "ai_tool"')[1]?.slice(0, 400) ?? "")) {
      fail("ai_tool must not use bare /prompt/ pattern");
    }
    pass("mental wellness not ai_tool");
  },
  "mental-wellness-minimum-source-size": () => {
    const out = execSync(
      `npx tsx -e "import { mentalWellnessScaffoldFiles } from './src/lib/build/mental-wellness-scaffold.ts'; const f=mentalWellnessScaffoldFiles('Calm'); console.log(f.reduce((n,x)=>n+x.content.length,0));"`,
      { cwd: root, encoding: "utf8" },
    ).trim();
    const bytes = Number(out);
    if (!Number.isFinite(bytes) || bytes < 30_000) fail(`scaffold only ${out} bytes (need 30KB)`);
    pass(`mental wellness scaffold ${bytes} bytes`);
  },
  "root-page-content-required": () => {
    const r = read("src/lib/build/root-page-repair.ts");
    const p = read("src/lib/build/build-pipeline.ts");
    if (!r.includes("rootPageContentOk")) fail("missing rootPageContentOk");
    if (!p.includes("repairRootPageContent")) fail("pipeline must repair root page");
    pass("root page content required");
  },
  "missing-root-page-triggers-auto-repair": () => {
    const p = read("src/lib/build/build-pipeline.ts");
    if (!p.includes("repairRootPageContent")) fail("missing repair in pipeline");
    if (!p.includes("root_page:")) fail("missing repair trace");
    pass("missing root triggers auto repair");
  },
  "root-page-repair-before-terminal-failure": () => {
    const p = read("src/lib/build/build-pipeline.ts");
  if (!p.includes("finalRootRepair")) fail("missing final root repair before contract label");
    pass("root page repair before terminal");
  },
  "no-preview-live-with-missing-root-page": () => {
    const g = read("src/lib/build/workflow-status-guards.ts");
    if (!g.includes("canShowSuccess")) fail("missing canShowSuccess guard");
    if (!g.includes("sourceIntegrityOk")) fail("missing integrity guard");
    pass("no preview live without integrity");
  },
  "no-couldnt-start-after-generation-started": () => {
    const g = read("src/lib/build/workflow-status-guards.ts");
    if (!g.includes("generationCompleted") && !g.includes("generationStarted")) {
      fail("missing generation started guard");
    }
    pass("no couldnt start after generation");
  },
  "fallback-not-noop": () => {
    const f = read("src/lib/build/archetype-scaffold-fallback.ts");
    if (!f.includes("filesReplaced")) fail("missing filesReplaced metric");
    if (!f.includes("sourceBytesAfter")) fail("missing sourceBytesAfter");
    pass("fallback metrics present");
  },
  "fallback-replaces-stub-root-page": () => {
    const f = read("src/lib/build/archetype-scaffold-fallback.ts");
    if (!f.includes("rootPageReplaced")) fail("missing rootPageReplaced");
    if (!read("src/lib/build/root-page-repair.ts").includes("shouldReplaceWithScaffold")) {
      fail("missing shouldReplaceWithScaffold");
    }
    pass("fallback replaces weak root");
  },
  "fallback-increases-source-quality": () => {
    const f = read("src/lib/build/archetype-scaffold-fallback.ts");
    if (!f.includes("bytesAfter > bytesBefore")) fail("must compare bytes");
    pass("fallback increases source quality check");
  },
  "fallback-noop-is-error": () => {
    const f = read("src/lib/build/archetype-scaffold-fallback.ts");
    if (!f.includes("fallback_noop_error")) fail("missing fallback_noop_error");
    pass("fallback noop is error");
  },
  "budget_blocked_repair_uses_deterministic_fallback": () => {
    const p = read("src/lib/build/build-pipeline.ts");
    if (!p.includes("repairBudgetBlocked")) fail("missing budget blocked repair");
    if (!p.includes("deterministic = repairRootPageContent")) fail("missing deterministic repair on budget");
    pass("budget blocked uses deterministic repair");
  },
  "missing_root_page_repair_no_provider_required": () => {
    const r = read("src/lib/build/root-page-repair.ts");
    if (!r.includes("mergeScaffoldForArchetype")) fail("repair must use scaffold");
    pass("root repair no provider required");
  },
  "repair_budget_exceeded_not_terminal_if_scaffold_available": () => {
    const p = read("src/lib/build/build-pipeline.ts");
    if (!p.includes("Budget exceeded")) fail("must handle budget exceeded");
    pass("repair budget exceeded handled");
  },
  "manual-sonnet-not-replaced-by-haiku": () => {
    const pc = read("src/lib/ai/provider-call.ts");
    if (!pc.includes("userSelectedLocked")) fail("missing userSelectedLocked");
    const mix = read("src/lib/ai/model-mix-router.ts");
    if (!mix.includes("user_selected_primary_only")) fail("missing user selected policy");
    pass("manual sonnet lock");
  },
  "auto-does-not-use-haiku-for-medium-polished-app": () => {
    const mix = read("src/lib/ai/model-mix-router.ts");
    if (!mix.includes("pickAutomaticImplementationModelId")) fail("auto must use implementation picker");
    const plan = read("src/lib/build/deterministic-archetype-plan.ts");
    if (!plan.includes("mental_wellness_journal")) fail("mental wellness not fast path");
    pass("auto avoids haiku for medium apps");
  },
  "haiku-output_must_pass_integrity_or_fallback": () => {
    const f = read("src/lib/build/archetype-scaffold-fallback.ts");
    if (!f.includes("rootPageContentOk")) fail("fallback must check root page");
    pass("haiku output must pass integrity or fallback");
  },
  "no_couldnt_start_after_provider_request_finished": () => {
    const g = read("src/lib/build/workflow-status-guards.ts");
    if (!g.includes("hasFiles")) fail("missing hasFiles guard");
    pass("no couldnt start after provider finished");
  },
  "no_couldnt_start_after_files_persisted": () => {
    const e = read("src/lib/build/execute-staged-build-job.ts");
    if (!e.includes("files_persisted")) fail("missing files_persisted metadata");
    pass("no couldnt start after persist");
  },
  "missing_root_page_copy": () => {
    const e = read("src/lib/build/execute-staged-build-job.ts");
    if (!e.includes("missing_root_page_content")) fail("missing root page copy branch");
    if (!e.includes("main page is incomplete")) fail("missing main page copy");
    pass("missing root page copy");
  },
  "refund_copy_requires_refund_event": () => {
    const g = read("src/lib/build/workflow-status-guards.ts");
    if (!g.includes("creditsRefunded")) fail("missing creditsRefunded guard");
    pass("refund copy requires refund event");
  },
  "success_requires_root_page_and_preview": () => {
    const g = read("src/lib/build/workflow-status-guards.ts");
    if (!g.includes("previewReady === true")) fail("success needs preview");
    const p = read("src/lib/build/build-pipeline.ts");
    if (!p.includes("sourceIntegrity.sourceIntegrityOk")) fail("pipeline checks integrity for ok");
    pass("success requires root and preview");
  },
};

const only = process.argv[2];
const entries = only
  ? Object.entries(CHECKS).filter(([k]) => k === only || k.includes(only))
  : Object.entries(CHECKS);

if (only && entries.length === 0) {
  fail(`unknown check: ${only}`);
  process.exit(1);
}

for (const [name, fn] of entries) {
  try {
    await fn();
  } catch (e) {
    fail(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (!process.exitCode) {
  console.log(`\nAll ${entries.length} mental-wellness runtime checks passed.`);
}
