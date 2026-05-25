#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/create/workspace/model-picker.tsx", "isFree", "free plan gate", errors);
mustInclude("src/components/create/workspace/model-picker.tsx", "Upgrade to choose a model", "upgrade copy", errors);
mustInclude("src/components/create/workspace/model-picker.tsx", "data-testid=\"model-selector-free\"", "free selector test id", errors);
mustInclude("src/components/create/workspace/model-picker.tsx", "data-testid=\"model-selector-paid\"", "paid selector test id", errors);
exitReport("verify:model-selector-plan-gate", errors, errors.length ? [] : ["model selector plan gate ok"]);
