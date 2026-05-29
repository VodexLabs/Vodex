#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(
  root,
  "src/components/marketing/legal/terms-content.tsx",
  ["Payments and third-party billing", "merchant of record", "chargebacks"],
  errors,
);

finish("verify:terms-payment-responsibility", errors);
