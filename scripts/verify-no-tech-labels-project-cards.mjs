#!/usr/bin/env node
import { mustInclude, mustNotInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
const ok = [];

mustInclude("src/lib/projects/user-safe-project-badges.ts", "getUserSafeProjectBadges", null, errors);
mustInclude("src/components/apps/projects-view.tsx", "getUserSafeProjectBadges", "projects-view uses user-safe badges", errors);
mustNotInclude("src/components/apps/projects-view.tsx", "Imported ZIP", "no Imported ZIP on cards", errors);
mustNotInclude("src/components/apps/projects-view.tsx", "project.framework", "no framework on card footer", errors);
mustNotInclude("src/components/os-home/your-apps-section.tsx", "frameworkLabel", "no frameworkLabel helper", errors);
mustNotInclude("src/components/os-home/your-apps-section.tsx", "fileSummary", "no fileSummary helper", errors);

if (errors.length === 0) ok.push("project cards hide tech labels");
exitReport("verify:no-tech-labels-project-cards", errors, ok);
