#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/lib/projects/user-safe-project-badges.ts", 'mode?: "user" | "admin"', "mode option", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", 'mode = "user"', "default user mode", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Draft idea", "draft label", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Plan ready", "plan ready label", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Imported app", "imported app label", errors);
exitReport("verify:user-safe-project-badges", errors, errors.length ? [] : ["user-safe badge helper complete"]);
