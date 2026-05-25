#!/usr/bin/env node
import { mustNotInclude, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
mustNotInclude("src/components/os-home/os-home.tsx", "Discuss", "no Discuss tab on home", errors);
mustNotInclude("src/components/os-home/os-home.tsx", "Edit", "no Edit tab on home", errors);
mustNotInclude("src/components/os-home/os-home.tsx", "MessageCircle", "no discuss icon on home", errors);
mustNotInclude("src/components/os-home/os-home.tsx", "MODES.map", "no mode tabs on home", errors);
exitReport("verify:home-composer-no-discuss-edit", errors, errors.length ? [] : ["home composer hides discuss/edit"]);
