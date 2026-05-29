#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(root, "src/lib/generated-app-payments/providers/paypal.ts", ["verifyPaypalConfig", "createPaypalCheckout"], errors);
mustInclude(root, "src/lib/generated-app-payments/revenue-ledger.ts", ["normalizePaypalEvent"], errors);
mustInclude(root, "src/lib/generated-app-payments/webhook-processor.ts", ['input.provider === "paypal"'], errors);
finish("verify:paypal-production", errors);
