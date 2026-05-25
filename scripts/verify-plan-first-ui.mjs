#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/create/workspace/plan-first-control.tsx", "Plan first", "plan first label", errors);
mustInclude("src/components/create/workspace/plan-first-control.tsx", "Build now", "build now label", errors);
mustInclude("src/components/create/workspace/plan-first-control.tsx", "data-testid=\"plan-first-control\"", "test id", errors);
mustInclude("src/components/os-home/os-home.tsx", "PlanFirstControl", "home has plan control", errors);
exitReport("verify:plan-first-ui", errors, errors.length ? [] : ["plan first UI present"]);
