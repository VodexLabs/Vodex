import { getRuntimeRepairSql } from "@/lib/admin/sql/runtime-repair-sql";

/** Executable SQL only — safe to paste in Supabase SQL Editor. */
export function getCreditBillingSqlPatch(): string {
  return getRuntimeRepairSql();
}
