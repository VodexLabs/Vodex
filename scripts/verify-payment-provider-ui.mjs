#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustExist, mustInclude, mustExclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

mustExist(root, "src/components/payments/project-payments-panel.tsx", errors);
mustInclude(root, "src/components/payments/project-payments-panel.tsx", ["Payments & Billing", "RevenueCat", "Verify config"], errors);
mustExclude(root, "src/components/payments/project-payments-panel.tsx", ["provider_cost", "provider cost"], errors);

finish("verify:payment-provider-ui", errors);
