#!/usr/bin/env npx tsx
/**
 * Print safe Supabase env diagnostics for CLI debug scripts.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSupabaseDebugEnvDiagnostic,
  formatSupabaseDebugEnvDiagnostic,
} from "../src/lib/cli/supabase-debug-env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const diag = buildSupabaseDebugEnvDiagnostic(root);
console.log(formatSupabaseDebugEnvDiagnostic(diag));
process.exit(diag.errors.length > 0 ? 1 : 0);
