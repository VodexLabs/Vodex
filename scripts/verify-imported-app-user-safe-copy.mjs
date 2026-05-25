#!/usr/bin/env node
import { mustInclude, mustNotInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Imported app", "imported app badge", errors);
mustInclude("src/lib/projects/imported-project-state.ts", "Imported app", "imported status label", errors);
mustNotInclude("src/lib/projects/imported-project-state.ts", "Imported ZIP", "no ZIP in status", errors);
mustNotInclude("src/components/apps/projects-view.tsx", "ZIP", "no ZIP on project cards", errors);
exitReport("verify:imported-app-user-safe-copy", errors, errors.length ? [] : ["imported app copy ok"]);
