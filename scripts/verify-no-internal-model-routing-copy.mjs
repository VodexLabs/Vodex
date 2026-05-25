#!/usr/bin/env node
import { mustNotMatch, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustNotMatch("src/components/os-home/os-home.tsx", /cheap model|internal routing|provider cost/i, "home composer", errors);
mustNotMatch("src/components/create/workspace/model-picker.tsx", /cheap model|internal routing/i, "model picker", errors);
mustNotMatch("src/components/create/workspace/plan-first-control.tsx", /cheap model|internal routing/i, "plan control", errors);
exitReport("verify:no-internal-model-routing-copy", errors, errors.length ? [] : ["no internal routing copy"]);
