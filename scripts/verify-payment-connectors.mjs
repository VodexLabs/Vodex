#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustExist(root, "supabase/migrations/20260701120000_payment_connectors.sql", errors);
mustExist(root, "src/lib/generated-app-payments/connection-store.ts", errors);
mustExist(root, "src/app/api/projects/[id]/payments/providers/route.ts", errors);
mustExist(root, "src/app/api/webhooks/payments/[provider]/route.ts", errors);
mustExist(root, "src/lib/generated-app-payments/providers/stripe.ts", errors);
mustExist(root, "src/app/api/projects/[id]/payments/test-checkout/route.ts", errors);
mustInclude(root, "src/lib/generated-app-payments/webhook-processor.ts", ["processPaymentWebhook"], errors);
mustExist(root, "src/components/payments/project-payments-panel.tsx", errors);
mustInclude(root, "src/lib/platform-billing/index.ts", ["Do not import generated-app"], errors);
mustInclude(root, "src/lib/generated-app-payments/plan-gate.ts", ["canConnectAppPayments"], errors);

finish("verify:payment-connectors", errors);
