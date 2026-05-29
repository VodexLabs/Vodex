#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const panel = path.join(root, "src/components/payments/project-payments-panel.tsx");
const text = fs.readFileSync(panel, "utf8");
if (/encrypted_config|decryptSecretValue/.test(text)) {
  errors.push("project-payments-panel must not reference encrypted_config or decrypt");
}
if (!/type="password"/.test(text)) {
  errors.push("payment panel should use password inputs for secrets");
}

finish("verify:no-payment-secret-client-leak", errors);
