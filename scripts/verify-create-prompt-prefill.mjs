#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");
const errors = [];
const ok = [];

if (!entry.includes("searchParams") && !entry.includes("prompt")) {
  // check builder page for prompt prefill
  const builder = fs.readFileSync(path.join(root, "src/app/(workspace)/apps/[appId]/builder/page.tsx"), "utf8");
  if (!builder.includes("initialPrompt") && !builder.includes("prompt")) errors.push("prompt prefill in builder");
  else ok.push("prompt prefill in builder");
} else ok.push("create entry prompt support");

const createPage = fs.readFileSync(path.join(root, "src/app/(workspace)/create/page.tsx"), "utf8");
if (!createPage.includes("searchParams")) errors.push("create page reads searchParams");
else ok.push("create page searchParams");

console.log("\n=== verify:create-prompt-prefill ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
