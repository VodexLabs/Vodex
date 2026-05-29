#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { read, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = read(root, "src/lib/dashboard/section-access.ts");
const errors = [];
if (!t.includes('PRE_PUBLISH_UNLOCKED') || !t.includes('"overview"') || !t.includes('"settings"')) {
  errors.push("only overview+settings pre-publish");
}
for (const s of ["payments", "security", "secrets", "integrations"]) {
  if (!t.includes(`"${s}"`) || !t.includes("PUBLISH_GATED")) errors.push(`${s} must be publish gated`);
}
finish("verify:dashboard-locks-before-publish", errors);
