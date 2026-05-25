#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const staged = fs.readFileSync(path.join(root, "src/lib/chat/staged-build-response.ts"), "utf8");
let failed = false;
if (!staged.includes("buildSucceeded") || !staged.includes("actualUserCredits: 0")) {
  console.error("✗ staged build must refund on failure");
  failed = true;
} else console.log("✓ refund on failed build");
if (staged.includes("shouldCharge = pr.ok && savedFileCount")) {
  console.error("✗ old charge logic still present");
  failed = true;
} else console.log("✓ no legacy charge without contract");
process.exit(failed ? 1 : 0);
