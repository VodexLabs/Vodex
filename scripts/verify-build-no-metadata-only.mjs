#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const utils = fs.readFileSync(path.join(root, "src/lib/build/generated-file-utils.ts"), "utf8");
const extract = fs.readFileSync(path.join(root, "src/lib/creation/extract-fenced-code.ts"), "utf8");
let failed = false;
if (!utils.includes("dreamosappmeta")) {
  console.error("✗ hidden path filter");
  failed = true;
} else console.log("✓ hidden path filter");
if (!extract.includes("dreamos-app-meta")) {
  console.error("✗ skip meta in parseFencedFiles");
  failed = true;
} else console.log("✓ skip meta in parseFencedFiles");
process.exit(failed ? 1 : 0);
