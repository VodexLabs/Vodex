#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/os-home/os-home.tsx", "router.push(`/create?", "home opens create route", errors);
mustInclude("src/components/os-home/os-home.tsx", "autostart", "autostart param", errors);
mustInclude("src/components/create/create-workspace-entry.tsx", "/apps/${projectId}/builder", "create opens builder", errors);
exitReport("verify:home-prompt-opens-builder", errors, errors.length ? [] : ["home prompt opens builder"]);
