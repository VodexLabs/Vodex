#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ws = fs.readFileSync(path.join(root, "src/components/create/workspace/immersive-workspace.tsx"), "utf8");
const errors = [];
if (!ws.includes("setPendingUserBubble(text)") || !ws.includes('setInput("")')) errors.push("composer clear + optimistic bubble");
if (ws.indexOf('setInput("")') > ws.indexOf("setPendingUserBubble(text)")) {
  /* ok order - both near each other */
}
if (!ws.includes("enqueueAsyncBuild")) errors.push("async build enqueue");
if (!ws.includes("buildJobActiveRef")) errors.push("build job active ref");
if (ws.includes("disabled={isBusy}") && ws.includes("textarea")) errors.push("textarea still disabled by isBusy");
else console.log("✓ composer not disabled by full isBusy on textarea");
console.log(errors.length ? errors.map((e) => "✗ " + e).join("\n") : "✓ chat optimistic send checks");
process.exit(errors.length ? 1 : 0);
