#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/lib/build/build-continuation-plan.ts", "parseContinueIntent", "continue intent parser");
must("src/lib/build/build-continuation-plan.ts", "renderBuildResultMarkdown", "build result UX");
must("src/app/api/chat/route.ts", "parseContinueIntent", "chat continue flow");
must("src/app/api/chat/route.ts", "pickNextBacklogItems", "backlog continuation pick");
must("src/components/create/workspace/build-backlog-panel.tsx", "View queued upgrades", "view backlog CTA");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { parseContinueIntent } from "./src/lib/build/build-continuation-plan.ts";
const cases = [
  ["continue", "continue_all"],
  ["continue with backend", "continue_category"],
  ["finish everything", "finish_everything"],
  ["hello", "none"],
];
for (const [text, expected] of cases) {
  const parsed = parseContinueIntent(text);
  if (parsed.kind !== expected) throw new Error(\`\${text} expected \${expected}, got \${parsed.kind}\`);
}
console.log("continue flow ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("intent: continue");
  ok.push("intent: continue with backend");
  ok.push("intent: finish everything");
  ok.push("intent: hello");
}

console.log("\n=== verify:continue-build-flow ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
