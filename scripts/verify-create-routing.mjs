#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing ${rel}`);
    return;
  }
  if (!fs.readFileSync(full, "utf8").includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/app/(workspace)/create/page.tsx", "CreateWorkspaceEntry", "real create funnel");
must("src/app/(workspace)/apps/[appId]/builder/page.tsx", "BuilderProjectGate", "builder route");
must("src/components/create/premium-create-funnel.tsx", "/create", "create path");

console.log("\n=== verify:create-routing ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
