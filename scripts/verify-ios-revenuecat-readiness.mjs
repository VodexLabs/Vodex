#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
finish(
  "verify:ios-revenuecat-readiness",
  (() => {
    const e = [];
    mustInclude(root, "src/lib/mobile/readiness.ts", ["revenuecat_ios", "revenueCatConfigured"], e);
    return e;
  })(),
);
