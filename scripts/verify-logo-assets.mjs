#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/projects/app-logo-generation.ts", "MIN_LOGO_PX = 720", "720p minimum");
mustInclude("src/lib/projects/app-logo-generation.ts", "icon-1024.png", "1024 original stored");
mustInclude("src/lib/projects/app-logo-generation.ts", "icon-512.png", "512 derivative");
mustInclude("src/lib/projects/app-logo-generation.ts", "icon-192.png", "192 derivative");
mustInclude("src/lib/projects/app-logo-generation.ts", "favicon-64.png", "favicon derivative");
mustInclude("src/components/projects/project-icon.tsx", "ProjectIcon", "project icon component");
mustInclude("src/lib/projects/app-identity-service.ts", "icon_url", "icon url persisted");

process.exit(failed ? 1 : 0);
