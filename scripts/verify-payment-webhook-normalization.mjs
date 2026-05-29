#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(root, "src/lib/generated-app-payments/revenue-ledger.ts", ["normalizeStripeEvent", "normalizePaddleEvent", "normalizeLemonSqueezyEvent", "normalizePaypalEvent"], errors);
mustInclude(root, "src/lib/generated-app-payments/webhook-processor.ts", ["processPaymentWebhook", "paddle", "lemon_squeezy", "paypal"], errors);
finish("verify:payment-webhook-normalization", errors);
