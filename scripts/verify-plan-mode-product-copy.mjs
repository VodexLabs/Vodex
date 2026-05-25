#!/usr/bin/env node
import { mustNotMatch, mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/create/workspace/plan-first-control.tsx", "Review the plan before building", "plan first desc", errors);
mustInclude("src/components/create/workspace/plan-first-control.tsx", "Start creating immediately", "build now desc", errors);
mustNotMatch("src/components/create/workspace/plan-first-control.tsx", /estimated cost|cheap model|staged build|mock data/i, "plan control", errors);
exitReport("verify:plan-mode-product-copy", errors, errors.length ? [] : ["plan mode product copy ok"]);
