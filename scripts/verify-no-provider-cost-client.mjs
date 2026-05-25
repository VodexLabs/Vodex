#!/usr/bin/env node
/** Client bundles must not expose provider costs, margins, or internal routing. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const FORBIDDEN = [
  /\bprovider_cost_usd\b/i,
  /\bproviderCostUsd\b/,
  /\brevenueMultiplier\b/,
  /\bhelper_model_used\b/,
  /model-mix-router/,
  /\bmarginMultiplier\b/,
];

const scanDirs = ["src/components", "src/hooks", "src/lib/stores", "src/app/(app)", "src/app/(workspace)"];

function scanDir(rel) {
  const d = path.join(root, rel);
  if (!fs.existsSync(d)) return;
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    const relP = path.relative(root, p);
    if (ent.isDirectory()) scanDir(relP);
    else if (/\.(tsx|ts)$/.test(ent.name)) {
      const t = fs.readFileSync(p, "utf8");
      const isClient = t.includes('"use client"') || t.includes("'use client'");
      if (!isClient && !rel.startsWith("src/components")) continue;
      if (relP.includes("admin")) continue;
      for (const re of FORBIDDEN) {
        if (re.test(t)) errors.push(`${relP} exposes ${re}`);
      }
    }
  }
}

for (const d of scanDirs) scanDir(d);
if (errors.length === 0) ok.push("no provider cost or routing internals in client UI");

console.log("\n=== verify:no-provider-cost-client ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
