#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
finish(
  "verify:revenue-analytics-filter-by-app",
  (() => {
    const e = [];
    mustInclude(root, "src/app/api/analytics/revenue/route.ts", ["appId", "searchParams.get(\"appId\")"], e);
    mustInclude(root, "src/components/analytics/analytics-view.tsx", ["appId", "All apps"], e);
    return e;
  })(),
);
