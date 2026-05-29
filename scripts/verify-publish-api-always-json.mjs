#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/publish/route.ts"), "utf8");
const errors = [];
for (const token of ["ok: false", "code:", "message:", "details:"]) {
  if (!route.includes(token)) errors.push(`publish route missing ${token}`);
}
if (errors.length) {
  console.error("verify:publish-api-always-json FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:publish-api-always-json OK");
