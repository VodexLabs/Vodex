/** postMessage payloads from preview boot audit script inside iframe. */

export type PreviewBootResourceEntry = {
  name: string;
  initiatorType: string;
  transferSize: number;
  duration: number;
  responseStatus?: number;
};

export type PreviewBootAuditPayload = {
  type: "vodex-preview-boot-audit";
  phase: "snapshot" | "ready" | "asset-error" | "runtime-error" | "navigation" | "serviceworker";
  resources?: PreviewBootResourceEntry[];
  failedAssetUrl?: string;
  failedAssetTag?: string;
  errorMessage?: string;
  errorStack?: string;
  navigationMethod?: string;
  navigationUrl?: string;
  serviceWorkerCount?: number;
  virtualPath?: string;
  iframeUrl?: string;
  at?: string;
};

export type PreviewBootAuditSummary = {
  loadedCount: number;
  failedCount: number;
  cancelledOrIncompleteCount: number;
  firstFailedAssetUrl: string | null;
  firstRuntimeError: string | null;
  serviceWorkerCount: number | null;
  navigations: Array<{ method: string; url: string }>;
  resources: PreviewBootResourceEntry[];
  bootFailureReason: string | null;
};

export function isPreviewBootAuditMessage(data: unknown): data is PreviewBootAuditPayload {
  if (!data || typeof data !== "object") return false;
  return (data as Record<string, unknown>).type === "vodex-preview-boot-audit";
}

export function summarizeBootAudit(
  events: PreviewBootAuditPayload[],
  opts?: { iframeRemountCount?: number },
): PreviewBootAuditSummary {
  const resources: PreviewBootResourceEntry[] = [];
  const navigations: Array<{ method: string; url: string }> = [];
  let failedCount = 0;
  let firstFailedAssetUrl: string | null = null;
  let firstRuntimeError: string | null = null;
  let serviceWorkerCount: number | null = null;

  for (const ev of events) {
    if (ev.phase === "snapshot" && ev.resources) {
      resources.push(...ev.resources);
    }
    if (ev.phase === "asset-error" && ev.failedAssetUrl) {
      failedCount += 1;
      firstFailedAssetUrl ??= ev.failedAssetUrl;
    }
    if (ev.phase === "runtime-error" && ev.errorMessage) {
      firstRuntimeError ??= ev.errorMessage;
    }
    if (ev.phase === "navigation" && ev.navigationMethod && ev.navigationUrl) {
      navigations.push({ method: ev.navigationMethod, url: ev.navigationUrl });
    }
    if (ev.phase === "serviceworker" && typeof ev.serviceWorkerCount === "number") {
      serviceWorkerCount = ev.serviceWorkerCount;
    }
  }

  const scriptResources = resources.filter(
    (r) => r.initiatorType === "script" || r.initiatorType === "link" || /\.(js|css|mjs)(\?|$)/i.test(r.name),
  );
  const loadedCount = scriptResources.filter((r) => r.transferSize > 0 || r.duration > 0).length;
  const cancelledOrIncompleteCount = scriptResources.filter(
    (r) => r.transferSize === 0 && r.duration === 0,
  ).length;

  let bootFailureReason: string | null = null;
  if (firstRuntimeError) {
    bootFailureReason = `Script runtime error: ${firstRuntimeError}`;
  } else if (firstFailedAssetUrl) {
    bootFailureReason = `Asset failed to load: ${firstFailedAssetUrl}`;
  } else if ((opts?.iframeRemountCount ?? 0) > 1 && cancelledOrIncompleteCount > 0) {
    bootFailureReason = "Assets cancelled — iframe remounted before boot completed";
  } else if (cancelledOrIncompleteCount > 0 && loadedCount === 0) {
    bootFailureReason = "Assets cancelled or loaded from wrong path";
  } else if (serviceWorkerCount != null && serviceWorkerCount > 0) {
    bootFailureReason = `Service worker interference (${serviceWorkerCount} registration(s))`;
  }

  return {
    loadedCount,
    failedCount,
    cancelledOrIncompleteCount,
    firstFailedAssetUrl,
    firstRuntimeError,
    serviceWorkerCount,
    navigations,
    resources,
    bootFailureReason,
  };
}
