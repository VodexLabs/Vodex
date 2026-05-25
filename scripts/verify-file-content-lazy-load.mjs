#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ok = fs.existsSync(path.join(root, "src/hooks/use-project-file-content.ts"));
console.log(ok ? "✓ lazy file content hook" : "✗");
process.exit(ok ? 0 : 1);
