#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const w = fs.readFileSync(path.join(root, "src/lib/action-credits/action-credit-warnings.ts"), "utf8");
const credits = fs.readFileSync(path.join(root, "src/app/api/credits/route.ts"), "utf8");

if (!w.includes("warn_80") || !w.includes("warn_90") || !w.includes("depleted")) errors.push("warning levels");
else ok.push("warning levels");

if (!w.includes("WARNING_COOLDOWN")) errors.push("email rate limit");
else ok.push("email rate limit");

if (!w.includes("platform_action_credit_warning")) errors.push("platform email label");
else ok.push("platform email (not charged to owner)");

if (!credits.includes("maybeNotifyActionCreditWarning")) errors.push("credits API not wired");
else ok.push("credits API wired");

console.log("\n=== verify:action-credit-warnings ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);
