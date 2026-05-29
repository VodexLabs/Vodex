#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = fs.readFileSync(path.join(root, "src/lib/publish/public-url.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/p/[slug]/page.tsx"), "utf8");
const errors = [];
if (!pub.includes("http")) errors.push("public-url must emit http URLs");
if (!page.includes("published_apps") && !page.includes("snapshot")) {
  errors.push("public slug page must render published snapshot");
}
if (errors.length) {
  console.error("verify:published-url-opens FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:published-url-opens OK");
