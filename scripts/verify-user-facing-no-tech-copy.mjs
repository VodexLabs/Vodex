#!/usr/bin/env node
import { scanUserUiFiles, exitReport } from "./p01-vibe-ui-checks.mjs";

const errors = [];
const FORBIDDEN = [
  { pattern: /\bnext\.?js\b/i, label: "nextjs" },
  { pattern: /\bvite\b/i, label: "vite" },
  { pattern: /source files|generated files/i, label: "source/generated files" },
  { pattern: /file count|route count/i, label: "file/route count" },
  { pattern: /\bsupabase\b/i, label: "supabase" },
  { pattern: /\bvercel\b/i, label: "vercel" },
  { pattern: /cheap model|provider cost|internal routing/i, label: "internal economics" },
  { pattern: /Imported ZIP/i, label: "Imported ZIP" },
  { pattern: /app_files|mobile_app_configs|WRAP_ANDROID_WEBHOOK/i, label: "internal db/webhook" },
];

scanUserUiFiles(FORBIDDEN, errors);
exitReport("verify:user-facing-no-tech-copy", errors, errors.length ? [] : ["user-facing UI scan clean"]);
