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

must("src/lib/intent/create-intent-classifier.ts", "classifyFirstCreatePrompt", "first prompt classifier");
must("src/lib/projects/create-project-from-prompt.ts", "classifyFirstCreatePrompt", "create project uses classifier");
must("src/app/api/chat/route.ts", "createQuestion", "chat create question flag");
must("src/app/api/chat/route.ts", "create_question", "create question charge mode");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { classifyFirstCreatePrompt } from "./src/lib/intent/create-intent-classifier.ts";
const cases = [
  ["How much does it cost to build an app?", "question_only", false],
  ["Can DreamOS86 build an app like Airbnb?", "question_only", false],
  ["Build me an app like Airbnb", "app_build_request", true],
  ["I want an app like Airbnb, is that possible?", "ambiguous", false],
];
for (const [text, intent, shouldCreate] of cases) {
  const r = classifyFirstCreatePrompt(text);
  if (r.intent !== intent) throw new Error(\`\${text} expected \${intent}, got \${r.intent}\`);
  if (r.shouldCreateProject !== shouldCreate) {
    throw new Error(\`\${text} shouldCreateProject=\${shouldCreate}, got \${r.shouldCreateProject}\`);
  }
}
console.log("first prompt intent ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("pricing question → question_only");
  ok.push("capability question → question_only");
  ok.push("build request → app_build_request");
  ok.push("possible-but-uncertain → ambiguous");
  ok.push("question_only never creates project");
}

console.log("\n=== verify:first-prompt-intent ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
