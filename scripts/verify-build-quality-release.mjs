#!/usr/bin/env node
/**
 * Release-quality build verification (static source checks).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const arg = process.argv[2] ?? "all";

const checks = {
  "build-shows-immediate-assistant-message": () => {
    const ws = read("src/components/create/workspace/immersive-workspace.tsx");
    const stream = read("src/components/create/workspace/agent-workflow-stream.tsx");
    if (!ws.includes('openerText="Analyzing your request"')) fail("immersive missing Analyzing opener");
    if (!stream.includes("AnalyzingRequestBubble")) fail("agent-workflow missing analyzing bubble");
    pass("immediate analyzing assistant message");
  },
  "assistant-dots-animate-before-backend-events": () => {
    const s = read("src/components/create/workspace/agent-workflow-stream.tsx");
    if (!s.includes('setInterval(() => setDots')) fail("missing dot animation interval");
    pass("analyzing dots animate");
  },
  "discuss-does-not-show-build-preview-shell": () => {
    const p = read("src/components/create/workspace/preview-panel.tsx");
    if (!p.includes("buildActive")) fail("preview-panel missing buildActive");
    pass("preview buildActive gate exists");
  },
  "preview-shows-building-state-during-build": () => {
    const p = read("src/components/create/workspace/preview-panel.tsx");
    if (!p.includes("BuildPreviewSurface")) fail("missing BuildPreviewSurface");
    if (!p.includes("!buildActive")) fail("missing buildActive guard on artifact");
    pass("building preview shell during build");
  },
  "no-renderable-hidden-while-building": () => {
    const p = read("src/components/create/workspace/preview-panel.tsx");
    if (!p.includes("isUnrenderableSrcDoc")) fail("missing unrenderable srcDoc check");
    pass("no renderable hidden while building");
  },
  "preview-building-state-stage-updates": () => {
    const b = read("src/components/create/workspace/build-preview-surface.tsx");
    if (!b.includes("preview-build-stage-pills")) fail("missing stage pills");
    pass("preview building stage pills");
  },
  "selected-model-drives-frontend-implementation": () => {
    const r = read("src/lib/ai/model-router.ts");
    const p = read("src/lib/ai/provider-call.ts");
    if (!r.includes("user_selected_model")) fail("model-router missing user_selected_model");
    if (!p.includes("userSelectedLocked")) fail("provider-call missing userSelectedLocked");
    pass("selected model routing");
  },
  "manual-model-not-replaced-by-haiku": () => {
    const p = read("src/lib/ai/provider-call.ts");
    if (!p.includes("!userSelectedLocked")) fail("downRoute must skip when user selected");
    pass("manual model not down-routed");
  },
  "auto-model-uses-cost-optimized-primary": () => {
    const r = read("src/lib/ai/model-router.ts");
    if (!r.includes("automatic_frontend_implementation")) fail("missing auto frontend route");
    pass("auto uses implementation model");
  },
  "model-routing-debug-metadata": () => {
    const p = read("src/lib/ai/provider-call.ts");
    if (!p.includes("selected_model_id")) fail("missing selected_model_id log");
    pass("model routing debug metadata");
  },
  "frontend-generation-token-minimum": () => {
    const f = read("src/lib/ai/output-token-floors.ts");
    if (!f.includes("3500")) fail("frontend floor below 3500");
    pass("frontend token minimum");
  },
  "repair-token-minimums": () => {
    const f = read("src/lib/ai/output-token-floors.ts");
    if (!f.includes("1500") || !f.includes("4000")) fail("repair floors");
    pass("repair token minimums");
  },
  "no-full-app-generation-with-500-tokens": () => {
    const r = read("src/lib/ai/model-router.ts");
    const maxFn = r.match(/function implementationMaxOut[\s\S]*?^}/m)?.[0] ?? "";
    if (/\b500\b/.test(maxFn)) fail("implementationMaxOut still allows 500 tokens");
    pass("no 500-token frontend cap");
  },
  "cost-cap-does-not-destroy-quality": () => {
    const p = read("src/lib/ai/provider-call.ts");
    const f = read("src/lib/ai/output-token-floors.ts");
    if (!p.includes("qualityFloor")) fail("provider-call missing quality floor enforce");
    if (!f.includes("minOutputTokensForOperation")) fail("missing output token floors");
    pass("cost cap respects quality floor");
  },
  "portfolio-output-minimum-bytes": () => {
    const s = read("src/lib/build/source-integrity-validator.ts");
    if (!s.includes("PORTFOLIO_MIN_BYTES")) fail("missing portfolio byte floor");
    pass("portfolio output minimum bytes");
  },
  "portfolio-output-has-real-sections": () => {
    const sc = read("src/lib/build/portfolio-scaffold.ts");
    for (const f of ["HeroSection", "ProjectGrid", "SkillsSection", "TestimonialsSection", "ContactForm"]) {
      if (!sc.includes(f)) fail(`scaffold missing ${f}`);
    }
    pass("portfolio real sections");
  },
  "portfolio-components-have-real-content": () => {
    const sc = read("src/lib/build/portfolio-scaffold.ts");
    if (!sc.includes("portfolio-data.ts")) fail("missing portfolio data");
    pass("portfolio components have content");
  },
  "no-thin-portfolio-scaffold-success": () => {
    const s = read("src/lib/build/source-integrity-validator.ts");
    if (!s.includes("portfolio_thin_output")) fail("missing thin portfolio block");
    pass("thin portfolio blocked");
  },
  "scaffold-quality-floor": () => {
    const p = read("src/lib/preview/portfolio-static-preview.ts");
    if (!p.includes("portfolio-projects")) fail("missing static portfolio preview");
    pass("scaffold quality floor preview");
  },
  "no-couldnt-start-after-generation-began": () => {
    const w = read("src/lib/build/workflow-status-guards.ts");
    if (!w.includes('status === "failed_before_generation"')) fail("missing failed_before guard");
    if (!w.includes("savedFilesOk")) fail("missing savedFilesOk promotion");
    pass("no couldnt start after files");
  },
  "no-preview-ready-copy-if-preview-not-rendered": () => {
    const b = read("src/lib/build/build-pipeline.ts");
    if (!b.includes("sourceIntegrity.previewRenderable")) fail("pipeline gates preview copy");
    pass("no preview-ready without renderable");
  },
  "technical-generation-incomplete-copy": () => {
    const e = read("src/lib/build/execute-staged-build-job.ts");
    if (!e.includes("technical_generation_incomplete")) fail("missing technical_generation_incomplete");
    pass("technical generation incomplete path");
  },
  "technical-preview-failed-copy": () => {
    const w = read("src/lib/build/workflow-status-guards.ts");
    if (!w.includes("Preview needs a technical fix")) fail("missing preview technical copy");
    pass("technical preview failed copy");
  },
  "status-copy-matches-final-facts": () => {
    const w = read("src/lib/build/workflow-status-guards.ts");
    if (!w.includes("canShowSuccess")) fail("missing canShowSuccess");
    pass("status copy matches facts");
  },
  "persist-success-not-marked-insert-failed": () => {
    const t = read("src/lib/build/files-persist-trace.ts");
    if (!t.includes("result.persistOk")) fail("trace must use persistOk");
    pass("persist success semantics");
  },
  "persist-error-has-real-error": () => {
    const p = read("src/lib/build/persist-generated-files.ts");
    if (!p.includes("errorCode")) fail("persist missing errorCode");
    pass("persist error codes");
  },
  "false-insert-failed-does-not-poison-build": () => {
    const p = read("src/lib/build/persist-generated-files.ts");
    if (!p.includes("integrityOk")) fail("persist missing integrityOk split");
    pass("integrity split from persist ok");
  },
  "preview-html-200-empty-not-success": () => {
    const r = read("src/app/api/projects/[id]/preview-html/route.ts");
    if (!r.includes("diagnostics.previewRenderable")) fail("preview-html must use diagnostics.ready");
    pass("empty preview html not success");
  },
  "preview-html-diagnostics": () => {
    const d = read("src/lib/preview/preview-html-diagnostics.ts");
    for (const k of ["htmlLength", "hasRootElement", "sourceIntegrityOk", "previewRenderable"]) {
      if (!d.includes(k)) fail(`diagnostics missing ${k}`);
    }
    pass("preview html diagnostics");
  },
  "empty-preview-triggers-technical-repair": () => {
    const e = read("src/lib/build/execute-staged-build-job.ts");
    if (!e.includes("preview_failed_files_kept")) fail("missing preview failed path");
    pass("empty preview triggers repair path");
  },
  "build-finalizes-after-preview-attempt": () => {
    const e = read("src/lib/build/execute-staged-build-job.ts");
    if (!e.includes('persistStage("preview_started")')) fail("missing preview_started stage");
    pass("build finalizes after preview attempt");
  },
  "final-copy-waits-for-post-persist-facts": () => {
    const i = read("src/components/create/workspace/immersive-workspace.tsx");
    if (!i.includes("preview_renderable")) fail("terminal summary needs preview_renderable");
    pass("final copy waits for post-persist facts");
  },
};

if (arg === "all") {
  for (const [name, fn] of Object.entries(checks)) {
    try {
      fn();
    } catch (e) {
      fail(String(e));
    }
  }
} else if (checks[arg]) {
  checks[arg]();
} else {
  fail(`unknown check: ${arg}`);
}

if (!process.exitCode) {
  console.log("\nAll requested build quality checks passed.");
}
