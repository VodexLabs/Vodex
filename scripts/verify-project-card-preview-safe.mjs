#!/usr/bin/env node
import { mustInclude, mustNotInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/projects/project-banner.tsx", "Preview will appear after setup", "imported placeholder copy", errors);
mustNotInclude("src/components/projects/project-banner.tsx", "framework", "no framework prop in banner", errors);
mustInclude("src/components/projects/project-banner.tsx", "previewOnly", "previewOnly mode", errors);
exitReport("verify:project-card-preview-safe", errors, errors.length ? [] : ["project card preview is user-safe"]);
