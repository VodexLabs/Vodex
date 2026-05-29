#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, mustExclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustInclude(
  root,
  "src/components/payments/project-payments-panel.tsx",
  ["Google Play and Apple process in-app purchases", "Mobile app subscriptions"],
  errors,
);
mustExclude(
  root,
  "src/components/payments/project-payments-panel.tsx",
  [/RevenueCat is the processor/i],
  errors,
);

finish("verify:revenuecat-mobile-billing", errors);
