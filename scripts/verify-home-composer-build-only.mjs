#!/usr/bin/env node
import { mustInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustInclude("src/components/os-home/os-home.tsx", 'data-testid="home-create-composer"', "home composer test id", errors);
mustInclude("src/components/os-home/os-home.tsx", "Build", "build label visible", errors);
mustInclude("src/components/os-home/os-home.tsx", 'storeAutostartHandoff(q, "build"', "always build mode handoff", errors);
exitReport("verify:home-composer-build-only", errors, errors.length ? [] : ["home composer is build-only"]);
