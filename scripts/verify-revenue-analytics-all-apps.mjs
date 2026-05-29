#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustExist(root, "src/app/api/analytics/revenue/route.ts", errors);
mustInclude(root, "src/components/analytics/analytics-view.tsx", ["RevenueAnalyticsSection", "/api/analytics/revenue"], errors);
mustExist(root, "supabase/migrations/20260702120000_payment_revenue_ledger.sql", errors);
mustInclude(root, "supabase/migrations/20260702120000_payment_revenue_ledger.sql", ["generated_app_revenue_events"], errors);
finish("verify:revenue-analytics-all-apps", errors);
