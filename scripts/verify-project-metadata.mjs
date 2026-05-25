#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const s = fs.readFileSync(path.join(root, rel), "utf8");
  if (!s.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/lib/projects/backfill-project-media.ts", "backfillProjectMediaIfNeeded", "metadata backfill helper");
must("src/lib/projects/backfill-project-media.ts", "ensureProjectIconSvg", "icon backfill");
must("src/lib/projects/backfill-project-media.ts", "buildProjectBannerSvg", "banner backfill");
must("src/components/projects/project-banner.tsx", "BannerPlaceholder", "banner placeholder");

console.log("\n=== verify:project-metadata ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);
