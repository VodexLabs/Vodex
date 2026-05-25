#!/usr/bin/env node
import { mustInclude, mustNotMatch, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/os-home/os-home.tsx", "shadow-[0_20px_56px", "softer home composer shadow", errors);
mustInclude("src/components/os-home/your-apps-section.tsx", "shadow-[0_8px_24px", "softer card shadow", errors);
mustNotMatch("src/components/os-home/your-apps-section.tsx", /code|script|framework/i, "no code banner on home cards", errors);
exitReport("verify:home-visual-safety", errors, errors.length ? [] : ["home visual safety ok"]);
