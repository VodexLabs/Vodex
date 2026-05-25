#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/files/route.ts"), "utf8");
const hook = fs.readFileSync(path.join(root, "src/hooks/use-project-files.ts"), "utf8");
const ok =
  route.includes("tree") &&
  !route.includes("select(\"path, content") &&
  hook.includes('content: ""') &&
  !hook.includes("loadFileContent");
console.log(ok ? "✓ file tree paths-only" : "✗");
process.exit(ok ? 0 : 1);
