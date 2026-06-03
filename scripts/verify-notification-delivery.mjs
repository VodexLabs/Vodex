#!/usr/bin/env node
/**
 * VODEX P2.6 — admin inbox delivery verification (static).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

const errors = [];
const route = read("src/app/api/admin/notifications/broadcast/route.ts");
const panel = read("src/components/admin/admin-inbox-messages-panel.tsx");

must(route, "INSERT_CHUNK", "chunked notification inserts", errors);
must(route, "No matching users found", "zero-recipient error", errors);
must(route, "recipientCount", "recipient count response", errors);
must(route, "resolveUserByEmail", "email resolution helper", errors);
must(route, 'from("notifications").insert', "notifications insert", errors);
must(panel, "No matching users found", "UI zero-recipient toast", errors);
must(panel, "recipientCount", "success count toast", errors);

if (errors.length) {
  console.error("verify:notification-delivery FAILED\n");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("verify:notification-delivery OK");
