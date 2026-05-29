#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const paddle = "src/lib/generated-app-payments/providers/paddle.ts";
mustExist(root, paddle, errors);
mustInclude(root, paddle, ["verifyPaddleConfig", "createPaddleCheckout", "verifyPaddleWebhookSignature"], errors);
mustInclude(root, "src/lib/generated-app-payments/revenue-ledger.ts", ["normalizePaddleEvent"], errors);
mustInclude(root, "src/lib/generated-app-payments/webhook-processor.ts", ['input.provider === "paddle"'], errors);
mustInclude(root, "src/lib/generated-app-payments/subscription-sync.ts", ["syncCustomerSubscriptionEntitlement"], errors);
finish("verify:paddle-production", errors);
