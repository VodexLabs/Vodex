#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/mobile/build/route.ts"), "utf8");
const mig = fs.readFileSync(path.join(root, "supabase/migrations/20260629120000_mobile_wrapper_system.sql"), "utf8");
const errors = [];
const ok = [];

if (!build.includes("createSignedUrl")) errors.push("signed artifact URLs");
else ok.push("signed artifact URLs");

if (!mig.includes("mobile_build_jobs")) errors.push("mobile_build_jobs table");
else ok.push("mobile_build_jobs table");

console.log("\n=== verify:mobile-artifact-security ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
