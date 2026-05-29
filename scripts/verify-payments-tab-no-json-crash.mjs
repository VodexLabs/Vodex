#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(root, "src/components/payments/project-payments-panel.tsx", ["parseJsonResponse", "published"], errors);
mustInclude(root, "src/lib/api/safe-json.ts", ["parseJsonResponse"], errors);
finish("verify:payments-tab-no-json-crash", errors);
