#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
mustInclude(root, "src/components/payments/project-payments-panel.tsx", ["if (!published)", "return null"], errors);
mustInclude(root, "src/components/create/workspace/app-dashboard-panel.tsx", ["sectionAccess !== \"unlocked\"", "DashboardLockedState"], errors);
finish("verify:locked-pages-do-not-fetch", errors);
