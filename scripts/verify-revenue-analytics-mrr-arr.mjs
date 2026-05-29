#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustExist(root, "src/lib/generated-app-payments/revenue-metrics.ts", errors);
mustInclude(root, "src/app/api/analytics/revenue/route.ts", ["computeMrrArrCents", "mrrCents", "arrCents"], errors);
mustInclude(root, "src/lib/generated-app-payments/revenue-metrics.ts", ["generated_app_subscriptions", "mrrCents"], errors);
finish("verify:revenue-analytics-mrr-arr", errors);
