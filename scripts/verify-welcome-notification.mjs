#!/usr/bin/env node
/**
 * VODEX P2.6 — welcome notification automation verification (static).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel, errors) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`missing ${rel}`);
}

function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

const errors = [];

exists("supabase/migrations/20260731120000_p26_notifications_presence_status_fix.sql", errors);
exists("src/lib/notifications/welcome-notification.ts", errors);
exists("src/app/api/notifications/welcome/route.ts", errors);

const mig = read("supabase/migrations/20260731120000_p26_notifications_presence_status_fix.sql");
must(mig, "backfill_welcome_notifications", "SQL backfill function", errors);

const welcome = read("src/lib/notifications/welcome-notification.ts");
must(welcome, "Welcome to Vodex", "welcome title prefix", errors);
must(welcome, "vodex_welcome", "premium welcome icon", errors);

const ensure = read("src/app/api/profile/ensure/route.ts");
must(ensure, "ensureWelcomeNotification", "welcome on profile bootstrap", errors);

const provider = read("src/components/providers/app-provider.tsx");
must(provider, "/api/notifications/welcome", "client welcome bootstrap", errors);

if (errors.length) {
  console.error("verify:welcome-notification FAILED\n");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("verify:welcome-notification OK");
