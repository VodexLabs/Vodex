#!/usr/bin/env node
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
must(read("src/lib/control-center/message-design-presets.ts"), "BACKGROUND_PRESETS", "background presets", errors);
must(read("src/components/control-center/inbox-notification-preview.tsx"), "max-w-[320px]", "compact inbox preview", errors);
must(read("src/components/control-center/topbar-banner-preview.tsx"), "admin-announcement-preview", "banner preview", errors);
must(read("src/components/admin/admin-inbox-messages-panel.tsx"), "MessageDesignFields", "inbox design fields", errors);
must(read("src/components/admin/admin-announcements-panel.tsx"), "TopbarBannerPreview", "announcement banner preview", errors);
must(read("src/lib/email/credit-usage-email-automation.ts"), "maybeSendCreditUsageEmails", "credit automation", errors);
must(read("src/lib/status/status-schema.ts"), "checkStatusSchemaReady", "schema probe", errors);
if (!fs.existsSync(path.join(root, "supabase/migrations/20260730120000_p23_control_center_visuals_and_status_fix.sql"))) {
  errors.push("missing p23 migration");
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ verify:control-center-visuals OK");
