#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const client = fs.readFileSync(
  path.join(root, "src/lib/create/async-build-client.ts"),
  "utf8",
);
const route = fs.readFileSync(path.join(root, "src/app/api/chat/route.ts"), "utf8");

if (!client.includes("text/event-stream")) {
  errors.push("async-build-client must detect text/event-stream");
} else ok.push("SSE detection in async client");

if (!client.includes('res.status !== 202')) {
  errors.push("async-build-client must require 202 for enqueue");
} else ok.push("202 required for async enqueue");

if (!route.includes("build_pipeline_unavailable")) {
  errors.push("chat route must return JSON 409 when async build unavailable");
} else ok.push("409 JSON when pipeline unavailable");

if (!route.includes("X-DreamOS-Async-Build")) {
  errors.push("chat route must read X-DreamOS-Async-Build");
} else ok.push("async build header handled");

console.log("\n=== verify:async-build-never-returns-sse-to-json-client ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
