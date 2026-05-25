#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const FORBIDDEN = [/process\.env\.RESEND_API_KEY/, /re_[a-zA-Z0-9_]{20,}/];
const ALLOWED_DOC_STRINGS = /RESEND_API_KEY missing|RESEND_API_KEY and|Set.*RESEND_API_KEY|RESEND_API_KEY=/;

function scan(rel) {
  const d = path.join(root, rel);
  if (!fs.existsSync(d)) return;
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    const relP = path.relative(root, p);
    if (ent.isDirectory()) scan(relP);
    else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      const t = fs.readFileSync(p, "utf8");
      const isClient = t.includes('"use client"') || t.includes("'use client'");
      if (!isClient && !rel.startsWith("src/components")) continue;
      for (const re of FORBIDDEN) {
        if (re.test(t)) {
          if (re.source.includes("RESEND") && ALLOWED_DOC_STRINGS.test(t) && !/process\.env\.RESEND/.test(t)) continue;
          errors.push(`${relP} exposes email secret pattern ${re}`);
        }
      }
    }
  }
}

for (const d of ["src/components", "src/hooks", "src/lib/stores", "src/app/(app)", "src/app/(workspace)", "src/app/contact"]) {
  scan(d);
}

if (errors.length === 0) ok.push("no Resend/email secrets in client-facing code");

console.log("\n=== verify:no-email-secret-client ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);
