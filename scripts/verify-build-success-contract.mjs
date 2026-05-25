#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  if (!fs.readFileSync(path.join(root, file), "utf8").includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/build/generated-ui-quality-checker.ts", "previewReadyMinScore", "preview ready min score export");
mustInclude("src/lib/build/ui-quality-contract.ts", "85", "85 UI quality contract");
mustInclude("src/lib/chat/staged-build-response.ts", "buildSucceeded", "staged build success gate");
mustInclude("src/lib/chat/staged-build-response.ts", "refundBuildReservation", "refund on failure");
mustInclude("src/lib/chat/staged-build-response.ts", "MIN_RENDERABLE_FILES", "min files for charge");

const evalScript = `
import { evaluateBuildSuccessContract } from "./src/lib/build/build-success-contract.ts";
import { checkGeneratedUiQuality } from "./src/lib/build/generated-ui-quality-checker.ts";
const bad = evaluateBuildSuccessContract({
  files: [{ path: "snippet-1.dreamosappmeta", content: '{"app":{}}' }],
  uiQuality: checkGeneratedUiQuality({ files: [], appType: "saas_dashboard" }),
  appName: "Untitled App",
  hasIcon: false,
});
if (bad.passed) throw new Error("untitled/metadata must fail contract");
console.log("build success contract ok");
`;

const r = spawnSync("npx", ["tsx", "--eval", evalScript], { cwd: root, shell: true, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  failed = true;
} else console.log(r.stdout?.trim());

process.exit(failed ? 1 : 0);
