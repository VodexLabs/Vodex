#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/components/chat/chat-view.tsx", "isSending", "send in-flight state");
must("src/components/chat/chat-view.tsx", "chatWorkingLabel", "working status label");
must("src/components/chat/chat-view.tsx", "opt-user-", "optimistic user message");

console.log("\n=== verify:chat-working-status ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
