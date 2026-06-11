#!/usr/bin/env node
/** P1.3.40 — preview routes must not inherit global X-Frame-Options: DENY from vercel.json. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const headers = vercel.headers ?? [];
const catchAll = headers.find((h) => h.source === "/(.*)");
const previewRuntime = headers.find((h) => h.source === "/preview-runtime/(.*)");

assert(catchAll, "catch-all header rule exists");
const catchAllXfo = catchAll.headers.find((h) => h.key === "X-Frame-Options");
assert(!catchAllXfo || catchAllXfo.value !== "DENY", "catch-all must not set X-Frame-Options: DENY");

assert(previewRuntime, "preview-runtime header rule exists");
const rtXfo = previewRuntime.headers.find((h) => h.key === "X-Frame-Options");
assert(rtXfo?.value === "SAMEORIGIN", "preview-runtime must set X-Frame-Options: SAMEORIGIN");

const previewHtml = headers.find((h) => h.source === "/api/projects/(.*)/preview-html");
assert(previewHtml, "preview-html header rule exists");

console.log("✓ verify:preview-vercel-embed-headers");
