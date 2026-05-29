#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stable = fs.readFileSync(path.join(root, "scripts/e2e-restaurant-stable.mjs"), "utf8");
const authIdx = stable.indexOf("e2e:auth:check");
const serverIdx = stable.indexOf("waitForDevServer");
if (authIdx < 0 || serverIdx < 0 || authIdx < serverIdx) {
  console.error("verify:restaurant-stable-starts-server-before-auth FAILED");
  process.exit(1);
}
console.log("verify:restaurant-stable-starts-server-before-auth OK");
