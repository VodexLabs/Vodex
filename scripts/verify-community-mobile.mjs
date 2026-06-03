#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/components/community/community-view.tsx"), "utf8");

const errors = [];
if (!src.includes("builders-coming-soon")) errors.push("builders coming soon testid");
if (src.includes("members")) {
  if (src.match(/builders\.length.*members/)) errors.push("builder member count");
}
if (src.includes("Discussions are slow to respond")) errors.push("slow respond copy still present");
if (!src.includes("DiscussionsInlineFallback")) errors.push("inline discussions fallback");
if (!src.includes("Builders directory is coming soon")) errors.push("coming soon title");
const timeoutRaw = src.match(/COMMUNITY_FETCH_TIMEOUT_MS = ([\d_]+)/)?.[1] ?? "0";
const timeoutMs = Number(timeoutRaw.replace(/_/g, ""));
if (timeoutMs < 5000) {
  errors.push("discussions timeout too aggressive");
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ verify:community-mobile OK");
