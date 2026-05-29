#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(
  root,
  "src/components/marketing/legal/privacy-content.tsx",
  ["encrypted API keys", "webhook events", "do not intentionally expose raw payment secrets"],
  errors,
);

finish("verify:privacy-payment-data", errors);
