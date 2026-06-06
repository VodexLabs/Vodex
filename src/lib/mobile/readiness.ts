import { scanAppSourceForReadiness } from "@/lib/publish/readiness-scan";
import type { MobileAppConfig, ReadinessItem, ReadinessResult } from "@/lib/mobile/types";
import {
  validateAndroidPackageId,
  validateIosBundleId,
  validateVersionName,
} from "@/lib/mobile/package-validation";

const SETUP_ONLY_IDS = new Set([
  "package_id",
  "version_name",
  "version_code",
  "bundle_id",
  "ios_build",
  "icon",
  "splash",
  "play_sha256",
  "play_sha1",
  "short_description",
  "full_description",
  "screenshots",
  "privacy_policy",
]);

function scoreFromItems(items: ReadinessItem[]): number {
  if (items.length === 0) return 0;
  let points = 0;
  for (const item of items) {
    if (item.status === "pass") points += 1;
    else if (item.status === "warning") points += 0.5;
    else if (SETUP_ONLY_IDS.has(item.id)) points += 0.35;
  }
  return Math.min(100, Math.round((points / items.length) * 100));
}

export function scanGeneralReadiness(input: {
  fileCount: number;
  hasPreview: boolean;
  appName?: string | null;
  description?: string | null;
  files: Array<{ path: string; content: string }>;
}): ReadinessResult {
  const items: ReadinessItem[] = [];

  items.push({
    id: "files",
    label: "App generated",
    status: input.fileCount > 0 ? "pass" : "missing",
    detail: input.fileCount > 0 ? `${input.fileCount} source files` : "Run a build or import a ZIP first",
    platform: "general",
  });

  items.push({
    id: "preview",
    label: "Preview available",
    status: input.hasPreview ? "pass" : "missing",
    detail: input.hasPreview ? "Web preview is ready" : "Open Preview after your app builds",
    platform: "general",
  });

  items.push({
    id: "name",
    label: "App name",
    status: input.appName?.trim() ? "pass" : "missing",
    detail: input.appName?.trim() ? input.appName : "Add an app name in Mobile setup",
    platform: "general",
  });

  items.push({
    id: "description",
    label: "App description",
    status: input.description?.trim() ? "pass" : "warning",
    detail: input.description?.trim() ? "Description set" : "Stores require a short description",
    platform: "general",
  });

  const hasMainRoute =
    input.files.some((f) => /\/(page|pages)\/(index|home)?\.(tsx|jsx|html)$/i.test(f.path)) ||
    input.files.some((f) => f.path === "index.html" || f.path.endsWith("/page.tsx"));

  items.push({
    id: "main_route",
    label: "Main screen",
    status: hasMainRoute ? "pass" : "warning",
    detail: hasMainRoute ? "Home route detected" : "No obvious home/page route found",
    platform: "general",
  });

  for (const issue of scanAppSourceForReadiness(input.files).slice(0, 4)) {
    items.push({
      id: `scan_${issue.id}`,
      label: issue.title,
      status: issue.severity === "error" ? "missing" : "warning",
      detail: issue.detail,
      platform: "general",
    });
  }

  return { platform: "general", items, score: scoreFromItems(items) };
}

export function scanAndroidReadiness(
  config: Partial<MobileAppConfig>,
  ctx: {
    hasSigningSecret: boolean;
    hasPlayServiceAccount: boolean;
    hasFirebase: boolean;
    fileCount: number;
    previewUrl?: string | null;
    revenueCatConfigured?: boolean;
  },
): ReadinessResult {
  const items: ReadinessItem[] = [];
  const pkg = validateAndroidPackageId(config.package_id);
  items.push({
    id: "package_id",
    label: "Android package ID",
    status: pkg.valid ? "pass" : "missing",
    detail: pkg.valid ? config.package_id! : (pkg.message ?? "Invalid package ID"),
    platform: "android",
  });

  items.push({
    id: "version_name",
    label: "Version name",
    status: validateVersionName(config.version_name) ? "pass" : "missing",
    detail: config.version_name ?? "Set version (e.g. 0.0.1)",
    platform: "android",
  });

  items.push({
    id: "version_code",
    label: "Version code",
    status: (config.android_version_code ?? 0) >= 1 ? "pass" : "missing",
    detail: `Version code ${config.android_version_code ?? "—"}`,
    platform: "android",
  });

  items.push({
    id: "icon",
    label: "App icon",
    status: config.icon_url ? "pass" : "missing",
    detail: config.icon_url ? "Icon configured" : "Upload or sync an app icon",
    platform: "android",
  });

  items.push({
    id: "splash",
    label: "Splash screen",
    status: config.splash_url ? "pass" : "warning",
    detail: config.splash_url ? "Splash configured" : "Recommended for store review",
    platform: "android",
  });

  items.push({
    id: "signing",
    label: "Signing configured",
    status: ctx.hasSigningSecret ? "pass" : "missing",
    detail: ctx.hasSigningSecret
      ? "Upload key stored securely"
      : "Add signing key in secure setup (Advanced)",
    platform: "android",
  });

  if (config.features?.push) {
    items.push({
      id: "firebase",
      label: "Push (Firebase)",
      status: ctx.hasFirebase ? "pass" : "missing",
      detail: ctx.hasFirebase ? "Firebase config saved" : "Add google-services.json in secure setup",
      platform: "android",
    });
  }

  items.push({
    id: "play_upload",
    label: "Play Console auto-upload",
    status: ctx.hasPlayServiceAccount ? "pass" : "warning",
    detail: ctx.hasPlayServiceAccount
      ? "Service account connected"
      : "Manual upload available until Google Play credentials are connected",
    platform: "android",
  });

  if (config.wrapper_type === "twa") {
    items.push({
      id: "twa_https",
      label: "HTTPS domain",
      status: ctx.previewUrl?.startsWith("https") ? "pass" : "missing",
      detail: "TWA requires a live HTTPS URL and Digital Asset Links",
      platform: "android",
    });
  }

  items.push({
    id: "revenuecat_android",
    label: "RevenueCat (Google Play)",
    status: ctx.revenueCatConfigured ? "pass" : "warning",
    detail: ctx.revenueCatConfigured
      ? "Public SDK key and entitlement configured for wrapper"
      : "Connect RevenueCat in Payments → Mobile subscriptions for in-app billing",
    platform: "android",
  });

  return { platform: "android", items, score: scoreFromItems(items) };
}

export function scanIosReadiness(
  config: Partial<MobileAppConfig>,
  ctx: {
    hasAscApiKey: boolean;
    hasApnsKey: boolean;
    hasSigningAssets: boolean;
    revenueCatConfigured?: boolean;
  },
): ReadinessResult {
  const items: ReadinessItem[] = [];
  const bundle = validateIosBundleId(config.bundle_id ?? config.package_id);
  items.push({
    id: "bundle_id",
    label: "Bundle ID",
    status: bundle.valid ? "pass" : "missing",
    detail: bundle.valid
      ? (config.bundle_id ?? config.package_id)!
      : (bundle.message ?? "Invalid bundle ID"),
    platform: "ios",
  });

  items.push({
    id: "ios_version",
    label: "Version & build",
    status:
      validateVersionName(config.version_name) && (config.ios_build_number ?? 0) >= 1
        ? "pass"
        : "missing",
    detail: `${config.version_name ?? "—"} (${config.ios_build_number ?? "—"})`,
    platform: "ios",
  });

  items.push({
    id: "icon",
    label: "App icon set",
    status: config.icon_url ? "pass" : "missing",
    detail: config.icon_url ? "Icon configured" : "Upload or sync app icon",
    platform: "ios",
  });

  items.push({
    id: "apple_dev",
    label: "Apple Developer account",
    status: "warning",
    detail:
      "You need an Apple Developer account and App Store Connect app record. Vodex guides setup once credentials are connected.",
    platform: "ios",
  });

  items.push({
    id: "asc_api",
    label: "App Store Connect API",
    status: ctx.hasAscApiKey ? "pass" : "missing",
    detail: ctx.hasAscApiKey
      ? "API key stored securely"
      : "Connect Key ID, Issuer ID, and private key in secure setup",
    platform: "ios",
  });

  items.push({
    id: "signing",
    label: "Signing & provisioning",
    status: ctx.hasSigningAssets ? "pass" : "missing",
    detail: ctx.hasSigningAssets
      ? "Signing assets configured"
      : "Certificate/provisioning profile required for device builds",
    platform: "ios",
  });

  if (config.features?.push) {
    items.push({
      id: "apns",
      label: "Push (APNs)",
      status: ctx.hasApnsKey ? "pass" : "missing",
      detail: ctx.hasApnsKey ? "APNs key stored" : "Add APNs key in secure setup",
      platform: "ios",
    });
  }

  items.push({
    id: "ios_build_env",
    label: "iOS build environment",
    status: "warning",
    detail:
      "iOS archives require macOS/Xcode or a connected cloud builder. Vodex prepares projects and export instructions honestly.",
    platform: "ios",
  });

  items.push({
    id: "revenuecat_ios",
    label: "RevenueCat (Apple IAP)",
    status: ctx.revenueCatConfigured ? "pass" : "warning",
    detail: ctx.revenueCatConfigured
      ? "Public SDK key and entitlement configured for wrapper"
      : "Connect RevenueCat in Payments → Mobile subscriptions for in-app billing",
    platform: "ios",
  });

  return { platform: "ios", items, score: scoreFromItems(items) };
}

export function storeReadinessChecklist(platform: "android" | "ios"): ReadinessItem[] {
  if (platform === "android") {
    return [
      { id: "play_name", label: "App name", status: "missing", detail: "Play Console listing", platform: "store" },
      { id: "play_short", label: "Short description", status: "missing", detail: "80 characters max", platform: "store" },
      { id: "play_full", label: "Full description", status: "missing", detail: "Store listing copy", platform: "store" },
      { id: "play_icon", label: "App icon", status: "missing", detail: "512×512 PNG", platform: "store" },
      { id: "play_feature", label: "Feature graphic", status: "missing", detail: "1024×500 PNG", platform: "store" },
      { id: "play_screenshots", label: "Screenshots", status: "missing", detail: "Phone + tablet sets", platform: "store" },
      { id: "play_privacy", label: "Privacy policy URL", status: "missing", detail: "Required for all apps", platform: "store" },
      { id: "play_data_safety", label: "Data safety form", status: "missing", detail: "Complete in Play Console", platform: "store" },
      { id: "play_content", label: "Content rating", status: "missing", detail: "IARC questionnaire", platform: "store" },
      { id: "play_aab", label: "AAB build", status: "missing", detail: "Upload signed AAB", platform: "store" },
    ];
  }
  return [
    { id: "asc_name", label: "App name", status: "missing", detail: "App Store Connect", platform: "store" },
    { id: "asc_subtitle", label: "Subtitle", status: "missing", detail: "30 characters max", platform: "store" },
    { id: "asc_description", label: "Description", status: "missing", detail: "Store listing copy", platform: "store" },
    { id: "asc_keywords", label: "Keywords", status: "missing", detail: "100 characters max", platform: "store" },
    { id: "asc_support", label: "Support URL", status: "missing", detail: "Public support page", platform: "store" },
    { id: "asc_privacy", label: "Privacy policy URL", status: "missing", detail: "Required", platform: "store" },
    { id: "asc_screenshots", label: "Screenshots", status: "missing", detail: "Per device class", platform: "store" },
    { id: "asc_privacy_labels", label: "Privacy nutrition labels", status: "missing", detail: "App Store Connect questionnaire", platform: "store" },
    { id: "asc_age", label: "Age rating", status: "missing", detail: "Content rating questionnaire", platform: "store" },
    { id: "asc_build", label: "Build uploaded", status: "missing", detail: "Valid archive/build number", platform: "store" },
  ];
}

export function scanStoreReadiness(
  config: Partial<MobileAppConfig>,
  platform: "android" | "ios",
): ReadinessResult {
  const base = storeReadinessChecklist(platform);
  const draft = config.store_draft ?? {};
  const items = base.map((item) => {
    const filled = Boolean(draft[item.id] ?? draft[item.label.toLowerCase().replace(/\s+/g, "_")]);
    return { ...item, status: filled ? ("pass" as const) : item.status };
  });
  return { platform: "store", items, score: scoreFromItems(items) };
}
