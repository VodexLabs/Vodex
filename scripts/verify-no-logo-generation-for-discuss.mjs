#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/build/build-pipeline.ts", "createAppIdentityForBuild", "identity only in build pipeline");

const evalScript = `
import { classifyCreateIntent } from "./src/lib/intent/create-intent-classifier.ts";
import { shouldStartBuildPipeline, classifyBuildIntent } from "./src/lib/ai/build-intent-classifier.ts";
const discuss = classifyCreateIntent("how much does this cost?", false);
if (discuss.shouldCreateProject) throw new Error("pricing question should not create");
const ideas = classifyCreateIntent("give me 20 app ideas", false);
if (ideas.shouldCreateProject) throw new Error("ideas should not create");
const buildIntent = classifyBuildIntent("build a CRM for dentists with scheduling");
if (!shouldStartBuildPipeline("build", buildIntent)) throw new Error("real build should start pipeline");
console.log("no logo for discuss ok");
`;

const r = spawnSync("npx", ["tsx", "--eval", evalScript], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  failed = true;
} else {
  console.log(r.stdout?.trim() || "✓ discuss/build gate checks");
}

process.exit(failed ? 1 : 0);
