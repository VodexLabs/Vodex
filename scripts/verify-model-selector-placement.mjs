#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/create/workspace/model-picker.tsx", 'placement?: "up" | "down" | "auto"', "placement prop", errors);
mustInclude("src/components/create/workspace/model-picker.tsx", "openUp", "smart open direction", errors);
mustInclude("src/components/create/workspace/model-picker.tsx", "data-dropdown-direction", "dropdown direction marker", errors);
mustInclude("src/components/os-home/os-home.tsx", 'placement="auto"', "home uses auto placement", errors);
exitReport("verify:model-selector-placement", errors, errors.length ? [] : ["model dropdown placement ok"]);
