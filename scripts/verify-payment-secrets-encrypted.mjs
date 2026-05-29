#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(
  root,
  "src/lib/secrets/payment-secrets.ts",
  ["encryptSecretValue", "decryptSecretValue", "redactSecretValue", "sealSecret"],
  errors,
);
mustInclude(
  root,
  "src/lib/generated-app-payments/connection-store.ts",
  ["encryptSecretValue", "encrypted_config"],
  errors,
);

finish("verify:payment-secrets-encrypted", errors);
