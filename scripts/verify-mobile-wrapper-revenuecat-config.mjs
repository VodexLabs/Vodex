#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustExist(root, "src/lib/mobile-billing/wrapper-config.ts", errors);
mustInclude(root, "src/lib/mobile/capacitor-generator.ts", ["dreamos-billing.json", "billingConfigJson"], errors);
mustInclude(root, "src/app/api/projects/[id]/mobile/build/route.ts", ["loadMobileRevenueCatPublicConfig", "buildDreamosBillingJson"], errors);
mustInclude(root, "src/lib/mobile-billing/wrapper-config.ts", ["public_sdk_key", "Public-only"], errors);
finish("verify:mobile-wrapper-revenuecat-config", errors);
