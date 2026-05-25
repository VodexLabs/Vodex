#!/usr/bin/env node
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

function mustNot(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (src.includes(needle)) errors.push(`${rel} still has ${label}`);
  else ok.push(label);
}

must("src/components/create/create-workspace-entry.tsx", "CreateWorkspaceEntry", "premium entry");
must("src/app/(workspace)/create/page.tsx", "CreateWorkspaceEntry", "create route entry");
mustNot("src/app/(workspace)/create/page.tsx", "PremiumCreateFunnel", "no old wizard on route");
must("src/app/(workspace)/apps/[appId]/builder/page.tsx", "ImmersiveWorkspace", "builder handoff target");

console.log("\n=== verify:create-route-premium ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
