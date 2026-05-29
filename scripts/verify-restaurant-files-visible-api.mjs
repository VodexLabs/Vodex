#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const qa = fs.readFileSync(path.join(root, "tests/e2e/helpers/restaurant-qa.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/files/route.ts"), "utf8");
const errors = [];

if (!qa.includes("body.paths")) errors.push("fetchProjectFiles must read body.paths");
if (!qa.includes("files?path=")) errors.push("fetchProjectFiles must load file bodies via ?path=");
if (!route.includes("count:") || !route.includes("paths")) {
  errors.push("files route must return count + paths");
}

if (errors.length) {
  console.error("verify:restaurant-files-visible-api FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:restaurant-files-visible-api OK");
