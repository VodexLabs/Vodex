#!/usr/bin/env node
/**
 * Shared checks for P0.1 vibe-coding UI cleanup verify scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`missing ${rel}`);
  return fs.readFileSync(full, "utf8");
}

export function mustInclude(rel, needle, label, errors) {
  const src = read(rel);
  if (!src.includes(needle)) errors.push(label ?? `missing ${needle} in ${rel}`);
}

export function mustNotInclude(rel, needle, label, errors) {
  const src = read(rel);
  if (src.includes(needle)) errors.push(label ?? `forbidden ${needle} in ${rel}`);
}

export function mustNotMatch(rel, pattern, label, errors) {
  const src = read(rel);
  if (pattern.test(src)) errors.push(label ?? `forbidden pattern in ${rel}`);
}

export function scanUserUiFiles(forbidden, errors, extraFiles = []) {
  const dirs = [
    "src/components/os-home",
    "src/components/apps/projects-view.tsx",
    "src/components/os-home/your-apps-section.tsx",
    "src/components/projects",
    "src/components/mobile/mobile-wrapper-studio.tsx",
  ];
  const files = new Set(extraFiles);
  for (const d of dirs) {
    const full = path.join(root, d);
    if (!fs.existsSync(full)) continue;
    if (full.endsWith(".tsx")) {
      files.add(d);
      continue;
    }
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith(".tsx") || f.endsWith(".ts")) files.add(path.join(d, f).replace(/\\/g, "/"));
    }
  }
  for (const rel of files) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    const src = read(rel);
    for (const { pattern, label } of forbidden) {
      if (pattern.test(src)) errors.push(`${rel}: forbidden user copy "${label}"`);
    }
  }
}

export function exitReport(name, errors, ok = []) {
  console.log(`\n=== ${name} ===\n`);
  ok.forEach((m) => console.log("✓", m));
  errors.forEach((m) => console.error("✗", m));
  process.exit(errors.length ? 1 : 0);
}
