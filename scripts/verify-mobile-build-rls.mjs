#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(path.join(root, "supabase/migrations/20260629120000_mobile_wrapper_system.sql"), "utf8");
const errors = [];
const ok = [];

if (!mig.includes("enable row level security")) errors.push("RLS enabled");
else ok.push("RLS enabled");
if (!mig.includes("owner_id = auth.uid()")) errors.push("owner RLS");
else ok.push("owner RLS");

console.log("\n=== verify:mobile-build-rls ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
