#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "src/app/(app)/settings/notifications/page.tsx"), "utf8");
const errors = [];
if (page.includes("Product emails")) errors.push("product emails removed");
if (!page.includes("In-web sounds")) errors.push("in-web sounds title");
if (!page.includes("prompt_finished")) errors.push("prompt finished sound");
if (!page.includes("build_completed")) errors.push("build completed sound");
if (!fs.existsSync(path.join(root, "src/components/settings/email-preferences-section.tsx"))) {
  errors.push("email prefs on account");
}
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ verify:sound-preferences OK");
