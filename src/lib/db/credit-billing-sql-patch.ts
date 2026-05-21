import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

/** Executable SQL only — safe to paste in Supabase SQL Editor. */
export function getCreditBillingSqlPatch(): string {
  if (cached) return cached;
  const path = join(process.cwd(), "scripts", "credit-billing-sql-patch.sql");
  try {
    cached = readFileSync(path, "utf8").trim();
    return cached;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "read_failed";
    throw new Error(`Credit billing SQL patch not found at ${path}: ${msg}`);
  }
}
