#!/usr/bin/env node
/**
 * Stable restaurant live E2E — owns dev server, 180s ping wait, auth probe, Playwright.
 */
import { runRestaurantE2e } from "./lib/e2e-restaurant-runner.mjs";

console.log("\n=== e2e:restaurant:stable ===\n");
const result = await runRestaurantE2e({ mode: "stable" });
console.log(`\n[e2e] mode=${result.mode} readinessMs=${result.readinessMs}\n`);
process.exit(result.exitCode);
