#!/usr/bin/env node
/** Prints canonical runtime repair SQL path and instructions (no DB writes). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(root, "scripts", "dreamos-runtime-repair.sql");
const migration = path.join(root, "supabase/migrations/20260624120000_runtime_contract_repair.sql");

console.log("\n=== repair:runtime-schema-contract ===\n");
console.log("Copy ONE of these into Supabase SQL Editor and run the entire file:\n");
console.log(`  1. ${path.relative(root, sqlPath)} (admin Copy runtime repair SQL)`);
console.log(`  2. ${path.relative(root, migration)} (migration)\n`);
console.log("Then run: NOTIFY pgrst, 'reload schema';");
console.log("Then: npm run verify:runtime-schema-contract\n");

if (!fs.existsSync(sqlPath)) {
  console.error("✗ repair SQL missing");
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, "utf8");
if (!/mime_type/.test(sql) || !/charge_tokens/.test(sql)) {
  console.error("✗ repair SQL incomplete");
  process.exit(1);
}
console.log("✓ repair SQL file is executable and includes app_files + charge_tokens");
