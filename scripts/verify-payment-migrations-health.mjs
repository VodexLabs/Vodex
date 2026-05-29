#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustExist(root, "src/lib/generated-app-payments/payment-migrations-health.ts", errors);
mustExist(root, "supabase/migrations/20260701120000_payment_connectors.sql", errors);
mustExist(root, "supabase/migrations/20260702120000_payment_revenue_ledger.sql", errors);
mustInclude(root, "src/lib/generated-app-payments/payment-migrations-health.ts", ["generated_app_revenue_events", "checkPaymentMigrationsHealth"], errors);
mustInclude(root, "src/app/api/projects/[id]/payments/providers/route.ts", ["checkPaymentMigrationsHealth", "setup_warning"], errors);
finish("verify:payment-migrations-health", errors);
