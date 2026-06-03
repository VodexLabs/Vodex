#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/components/notifications/notification-panel.tsx"), "utf8");
const errors = [];
if (!src.includes("useIsMobilePanel")) errors.push("mobile detection");
if (!src.includes("max-w-[420px]")) errors.push("max width 420");
if (!src.includes("left-3 right-3")) errors.push("centered mobile inset");
if (!src.includes("notification-inbox-tabs")) errors.push("inbox tabs");
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ verify:mobile-notifications OK");
