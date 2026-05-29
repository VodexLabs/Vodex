#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const needle = "Credits reserved";

function walk(dir, hits = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, hits);
    else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name) && fs.readFileSync(p, "utf8").includes(needle)) {
      hits.push(p);
    }
  }
  return hits;
}

const hits = walk(path.join(root, "src"));
if (hits.length) errors.push(`found reserved-credits copy in: ${hits.join(", ")}`);

finish("verify:no-credit-reserved-copy", errors);
