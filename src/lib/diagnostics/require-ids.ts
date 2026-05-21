import { logMissingId } from "@/lib/diagnostics/dreamos-logger";
import type { DreamosLogInput } from "@/lib/diagnostics/dreamos-logger";

type IdContext = Omit<DreamosLogInput, "message" | "category" | "severity">;

export function requireId(
  name: string,
  value: string | null | undefined,
  ctx: IdContext,
): value is string {
  if (typeof value === "string" && value.trim().length > 0) return true;
  logMissingId(name, { ...ctx, metadata: { ...ctx.metadata, received: value ?? null } });
  return false;
}
