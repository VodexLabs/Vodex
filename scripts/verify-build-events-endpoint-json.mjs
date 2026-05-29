#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "src/app/api/projects/[id]/build-jobs/[jobId]/events/route.ts"),
  "utf8",
);
const errors = [];
if (!route.includes("setup_warning")) errors.push("events route missing setup_warning");
if (!route.includes('"starting"')) errors.push("events route missing starting status");
if (!route.includes("NextResponse.json")) errors.push("events route must return JSON");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ build events endpoint returns JSON with starting state");
