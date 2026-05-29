#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(
  root,
  "supabase/migrations/20260702120000_payment_revenue_ledger.sql",
  ["unique (project_id, provider, external_event_id)"],
  errors,
);
mustInclude(root, "src/lib/generated-app-payments/revenue-ledger.ts", ["insertRevenueEventIfNew", "duplicate"], errors);
finish("verify:payment-ledger-idempotency", errors);
