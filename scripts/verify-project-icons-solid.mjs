#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/projects/project-icon.tsx", "bg-surface", "solid icon background", errors);
mustInclude("src/lib/projects/ensure-project-icon.ts", "isWeakIconSvg", "weak icon guard", errors);
mustInclude("src/lib/projects/ensure-project-icon.ts", "ensureProjectIconSvg", "ensure solid icon svg", errors);
exitReport("verify:project-icons-solid", errors, errors.length ? [] : ["project icons are solid"]);
