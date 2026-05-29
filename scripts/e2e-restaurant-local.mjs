#!/usr/bin/env node
/**
 * Restaurant E2E when `npm run dev` is already healthy.
 * Does not kill port 3000 during Playwright — reuses the running instance.
 */
import { spawnSync } from "node:child_process";
import { runRestaurantE2e } from "./lib/e2e-restaurant-runner.mjs";

process.env.E2E_SKIP_RESTAURANT_PREFLIGHT ??= "1";
process.env.E2E_RESTAURANT_LOCAL ??= "1";

console.log("\n=== e2e:restaurant:local ===\n");

const result = await runRestaurantE2e({ mode: "local" });
console.log(`\n[e2e] mode=${result.mode} readinessMs=${result.readinessMs}\n`);
process.exit(result.exitCode);
