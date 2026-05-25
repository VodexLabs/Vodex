#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const immersive = fs.readFileSync(path.join(root, "src/components/create/workspace/immersive-workspace.tsx"), "utf8");
const errors = [];
const ok = [];

if (!immersive.includes('method: "PUT"')) errors.push("blueprint PUT save");
else ok.push("blueprint PUT save");

if (!immersive.includes("Save your app first before building")) {
  if (immersive.includes("blueprintApprovedRef.current = true") && immersive.includes("!effectiveProjectId")) {
    errors.push("fake blueprint approval without project");
  } else ok.push("no fake approval without project");
} else ok.push("no fake approval without project");

if (!immersive.includes("confirmBlueprintBuild")) errors.push("confirmBlueprintBuild");
else ok.push("confirmBlueprintBuild");

console.log("\n=== verify:blueprint-to-build-handoff ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
