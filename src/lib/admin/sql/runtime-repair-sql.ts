import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

export const RUNTIME_REPAIR_SQL_PATH = join(process.cwd(), "scripts", "dreamos-runtime-repair.sql");

/** Executable SQL only — single source for Admin Copy SQL / diagnostics bundle. */
export function getRuntimeRepairSql(): string {
  if (cached) return cached;
  cached = readFileSync(RUNTIME_REPAIR_SQL_PATH, "utf8").trim();
  if (!/\b(create|alter|drop|grant|revoke|notify)\b/i.test(cached)) {
    throw new Error("Runtime repair SQL file is not executable SQL");
  }
  return cached;
}

/** Same as getRuntimeRepairSql() — lazy alias for admin copy buttons */
export function RUNTIME_REPAIR_SQL(): string {
  return getRuntimeRepairSql();
}

export function isExecutableSql(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 40) return false;
  if (/^run\s+supabase\//im.test(t)) return false;
  if (/^see\s+supabase\//im.test(t)) return false;
  if (!/\b(create|alter|drop|grant|revoke|notify|select)\b/i.test(t)) return false;
  return true;
}
