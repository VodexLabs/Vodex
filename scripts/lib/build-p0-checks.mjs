#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function must(rel, needles, label) {
  const src = read(rel);
  const missing = (Array.isArray(needles) ? needles : [needles]).filter((n) => !src.includes(n));
  if (missing.length) return { ok: false, label, missing };
  return { ok: true, label };
}

export function mustNot(rel, needles, label) {
  const src = read(rel);
  const found = (Array.isArray(needles) ? needles : [needles]).filter((n) => src.includes(n));
  if (found.length) return { ok: false, label, found };
  return { ok: true, label };
}
