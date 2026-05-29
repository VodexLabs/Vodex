#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
function mustExist(r, rel) {
  if (!fs.existsSync(path.join(r, rel))) errors.push(`missing ${rel}`);
}
mustExist(root, "src/lib/api/json-response.ts");
const api = path.join(root, "src/app/api");
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === "route.ts" && p.includes("payments")) {
      const t = fs.readFileSync(p, "utf8");
      if (!/jsonOk|jsonError|NextResponse\.json/.test(t)) {
        errors.push(`${p}: must return JSON via jsonOk/jsonError or NextResponse.json`);
      }
    }
  }
}
walk(api);
finish("verify:payments-api-always-json", errors);
