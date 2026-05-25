#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = fs.readFileSync(path.join(root, "src/lib/build/build-error.ts"), "utf8");
const ok = f.includes("normalizeBuildError") && f.includes("userMessage") && f.includes("retryable");
console.log(ok ? "✓ build error normalization" : "✗");
process.exit(ok ? 0 : 1);
