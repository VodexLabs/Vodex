#!/usr/bin/env node
import { mustNotMatch, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
const files = [
  "src/components/os-home/os-home.tsx",
  "src/components/create/workspace/plan-first-control.tsx",
  "src/components/build/blueprint-confirmation-modal.tsx",
];
for (const f of files) {
  mustNotMatch(f, /lovable|base44/i, `no lovable copy in ${f}`, errors);
}
exitReport("verify:no-lovable-copy", errors, errors.length ? [] : ["no lovable/base44 copy"]);
