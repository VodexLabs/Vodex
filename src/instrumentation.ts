/**
 * Called once when the Next.js server starts, before any requests are handled.
 */
import { logAppOriginBoot } from "@/lib/url/app-origin";
import { logSupabaseEnvBoot } from "@/lib/supabase/validate-supabase-env";

export function register() {
  if (process.env.NODE_ENV === "development") {
    logAppOriginBoot();
    logSupabaseEnvBoot();
  }
}
