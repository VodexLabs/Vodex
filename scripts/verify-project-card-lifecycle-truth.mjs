#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Review plan", "plan ready CTA", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Continue setup", "needs setup CTA", errors);
mustInclude("src/lib/projects/user-safe-project-badges.ts", "Draft idea", "draft label", errors);
mustInclude("src/lib/projects/project-lifecycle.ts", "ctx.fileCount === 0", "zero files guard", errors);
exitReport("verify:project-card-lifecycle-truth", errors, errors.length ? [] : ["project card lifecycle truth ok"]);
