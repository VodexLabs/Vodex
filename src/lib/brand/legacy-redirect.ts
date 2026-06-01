import { APP_URL } from "@/lib/brand/brand-config";
import {
  canonicalizePlatformOrigin,
  isLegacyPlatformHostname,
  isProductionPlatformHostname,
  LEGACY_DREAMOS86_PLATFORM_HOSTS,
} from "@/lib/brand/legacy-brand-allowlist";

export {
  LEGACY_DREAMOS86_PLATFORM_HOSTS,
  isLegacyPlatformHostname,
  isProductionPlatformHostname,
  canonicalizePlatformOrigin,
};

/** Production OAuth / billing fallback when env is unset. */
export function getCanonicalProductionAppOrigin(): string {
  return APP_URL;
}
