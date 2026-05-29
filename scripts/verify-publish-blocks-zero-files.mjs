#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readiness = fs.readFileSync(path.join(root, "src/lib/publish/publish-readiness.ts"), "utf8");
if (!readiness.includes("No generated app files yet")) {
  console.error("verify:publish-blocks-zero-files FAILED");
  process.exit(1);
}
console.log("verify:publish-blocks-zero-files OK");
