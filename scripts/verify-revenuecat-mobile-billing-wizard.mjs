#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustExist(root, "src/components/payments/mobile-billing-wizard.tsx", errors);
mustExist(root, "src/app/api/projects/[id]/mobile-billing/route.ts", errors);
mustInclude(root, "src/components/payments/mobile-billing-wizard.tsx", ["Google Play and Apple process"], errors);
mustInclude(root, "src/lib/mobile-billing/revenuecat.ts", ["verifyRevenueCatConfig"], errors);
finish("verify:revenuecat-mobile-billing-wizard", errors);
