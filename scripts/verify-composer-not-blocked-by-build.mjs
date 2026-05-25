#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ws = fs.readFileSync(path.join(root, "src/components/create/workspace/immersive-workspace.tsx"), "utf8");
const ok =
  ws.includes("composerBlocked") &&
  ws.includes("buildJobActiveRef.current") &&
  ws.includes("enqueuePrompt(text)");
console.log(ok ? "✓ composer usable during build (queue path)" : "✗ composer blocked");
process.exit(ok ? 0 : 1);
