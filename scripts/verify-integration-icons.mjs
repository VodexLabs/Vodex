#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/components/brand/integration-icons.tsx"), "utf8");
const required = ["paddle", "paypal", "lemonsqueezy", "discord", "anthropic", "firebase"];
const errors = required.filter((id) => !src.includes(`${id}:`));
if (errors.length) {
  console.error("verify:integration-icons FAILED\n", errors.map((e) => `  - missing ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:integration-icons OK");
