#!/usr/bin/env node
import { mustNotInclude, mustNotMatch, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustNotMatch("src/components/os-home/os-home.tsx", /\bnextjs\b/i, "no nextjs on home", errors);
mustNotMatch("src/components/os-home/your-apps-section.tsx", /\bvite\b/i, "no vite on home cards", errors);
mustNotMatch("src/components/os-home/your-apps-section.tsx", /file_count|files\b/i, "no file count on home cards", errors);
mustNotInclude("src/components/os-home/your-apps-section.tsx", "framework", "no framework badges on home", errors);
exitReport("verify:no-framework-copy-in-home", errors, errors.length ? [] : ["home has no framework copy"]);
