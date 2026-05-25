#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ws = fs.readFileSync(path.join(root, "src/components/create/workspace/immersive-workspace.tsx"), "utf8");
const ok =
  ws.includes("promptQueueRef") &&
  ws.includes("QueuedPromptCard") &&
  ws.includes("buildJobActiveRef.current");
console.log(ok ? "✓ build job queue" : "✗ queue missing");
process.exit(ok ? 0 : 1);
