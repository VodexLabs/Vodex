#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustExist(root, "src/app/api/webhooks/payments/[provider]/route.ts", errors);
mustInclude(root, "src/lib/generated-app-payments/connection-store.ts", ["storeWebhookEvent"], errors);

finish("verify:payment-webhooks", errors);
