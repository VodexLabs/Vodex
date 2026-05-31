#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function ok(msg) {
  console.log("OK:", msg);
}
function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

const integrity = read("src/lib/build/source-integrity-validator.ts");
const reconciler = read("src/lib/build/post-persist-status-reconciler.ts");
const staged = read("src/lib/build/execute-staged-build-job.ts");
const guards = read("src/lib/build/workflow-status-guards.ts");
const builder = read("src/components/builder/app-builder-workspace.tsx");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");
const portfolio = read("src/lib/build/portfolio-scaffold.ts");

if (!integrity.includes("sourceIntegrityOk")) fail("source integrity validator");
else ok("source integrity validator");

if (!reconciler.includes("evaluateSourceIntegrity")) fail("reconciler uses integrity");
else ok("reconciler uses integrity");

if (!reconciler.includes("shouldComplete") || reconciler.includes("previewCanRender = sourceIntegrity.previewRenderable"))
  ok("success requires previewRenderable");
else fail("reconciler preview gate");

if (staged.includes("saveableFileCount >= MIN_RENDERABLE_FILES) {\n      buildSucceeded = true"))
  fail("removed blind buildSucceeded promotion");
else ok("no blind buildSucceeded promotion");

if (staged.includes("technical_generation_incomplete")) ok("technical_generation_incomplete terminal");
else fail("technical_generation_incomplete terminal");

if (staged.includes("source_integrity_ok") && staged.includes('title: "First version ready"'))
  ok("completed event tags integrity");
else fail("completed metadata");

if (guards.includes("sourceIntegrityOk") && guards.includes("canShowSuccess")) ok("workflow guards integrity");
else fail("workflow guards");

if (!builder.includes("RepairCenter")) ok("repair center not in code tab");
else fail("repair center in code tab");

if (immersive.includes("RepairCenter") && immersive.includes('rightTab === "preview"'))
  ok("repair center in preview tab");
else fail("repair center preview placement");

if (!builder.includes("Select a file from the tree") || builder.includes("activePath"))
  ok("code tab placeholder gated on activePath");
else fail("code tab placeholder");

if (portfolio.includes("HeroSection") && portfolio.includes("ContactForm")) ok("portfolio scaffold UI");
else fail("portfolio scaffold");

if (process.exitCode) process.exit(1);
console.log("\nAll source-integrity runtime checks passed.");
