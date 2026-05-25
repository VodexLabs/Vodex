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

must("supabase/migrations/20260625120000_project_build_backlog.sql", "project_build_backlog", "backlog table migration");
must("src/lib/build/build-backlog.ts", "persistBuildBacklog", "persist backlog");
must("src/lib/build/build-backlog.ts", "loadBuildBacklog", "load backlog");
must("src/app/api/projects/[id]/backlog/route.ts", "loadBuildBacklog", "backlog API");
must("src/components/create/workspace/build-backlog-panel.tsx", "Continue building", "dashboard continue CTA");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { backlogItemsFromIntake } from "./src/lib/build/build-backlog.ts";
import { buildIntakeFromPrompt } from "./src/lib/ai/huge-prompt-intake.ts";
import { planFirstPassScope } from "./src/lib/build/first-pass-scope.ts";
const intake = buildIntakeFromPrompt("Build CRM with contacts, deals, pipeline, Stripe billing, OAuth, admin roles, Slack integration, analytics dashboard.");
const scope = planFirstPassScope(intake.summary);
const items = backlogItemsFromIntake("test-project", intake.summary, scope);
if (items.length < 2) throw new Error("expected multiple backlog items");
const hasAuth = items.some((i) => i.category === "auth" || i.category === "payments");
if (!hasAuth) throw new Error("backlog should include auth/payments deferrals");
console.log("backlog ok", items.length);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("backlog items extracted");
  ok.push("advanced categories classified");
}

console.log("\n=== verify:build-backlog ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
