#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/projects/app-identity-service.ts", "build_operation_id", "build operation id stored");
mustInclude("src/lib/projects/app-identity-service.ts", "ensureIdempotentIdentity", "idempotent read");
mustInclude("src/lib/projects/app-identity-service.ts", "logo_generation_operation_id", "logo operation id stored");
mustInclude("src/lib/chat/server-idempotency.ts", "hasSuccessfulChargeForOperation", "charge idempotency helper");

process.exit(failed ? 1 : 0);
