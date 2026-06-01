/**
 * Vodex platform owner — safe for client and server imports.
 * Override with ADMIN_OWNER_EMAIL in production.
 */
import { LEGACY_PLATFORM_OWNER_EMAIL } from "@/lib/brand/legacy-brand-allowlist";

export const DREAMOS_OWNER_EMAIL = LEGACY_PLATFORM_OWNER_EMAIL;

export function isDreamosOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === DREAMOS_OWNER_EMAIL.toLowerCase();
}

/** @alias */
export const isVodexOwnerEmail = isDreamosOwnerEmail;
