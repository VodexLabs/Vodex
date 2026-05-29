#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
finish(
  "verify:android-revenuecat-readiness",
  (() => {
    const e = [];
    mustInclude(root, "src/lib/mobile/readiness.ts", ["revenuecat_android", "revenueCatConfigured"], e);
    mustInclude(root, "src/app/api/projects/[id]/mobile/readiness/route.ts", ["loadMobileRevenueCatPublicConfig"], e);
    return e;
  })(),
);
