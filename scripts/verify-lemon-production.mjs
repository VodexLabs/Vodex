#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(root, "src/lib/generated-app-payments/providers/lemon-squeezy.ts", ["verifyLemonSqueezyConfig", "createLemonSqueezyCheckout", "verifyLemonSqueezyWebhookSignature"], errors);
mustInclude(root, "src/lib/generated-app-payments/revenue-ledger.ts", ["normalizeLemonSqueezyEvent"], errors);
mustInclude(root, "src/lib/generated-app-payments/webhook-processor.ts", ['input.provider === "lemon_squeezy"'], errors);
finish("verify:lemon-production", errors);
