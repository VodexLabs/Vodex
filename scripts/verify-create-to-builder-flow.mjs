#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");
const builder = fs.readFileSync(path.join(root, "src/app/(workspace)/apps/[appId]/builder/page.tsx"), "utf8");
const errors = [];
const ok = [];

if (!entry.includes("/builder")) errors.push("redirect to builder");
else ok.push("redirect to builder");

if (!builder.includes("ImmersiveWorkspace")) errors.push("ImmersiveWorkspace on builder");
else ok.push("ImmersiveWorkspace on builder");

if (!entry.includes("project-draft")) errors.push("project draft API");
else ok.push("project draft API");

console.log("\n=== verify:create-to-builder-flow ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
