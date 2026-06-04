import type { PreviewRuntimeStatusPayload } from "@/lib/preview/preview-runtime-status";

/** Avoid React re-render loops when polling returns the same runtime snapshot. */
export function previewRuntimeStatusEqual(
  a: PreviewRuntimeStatusPayload | null,
  b: PreviewRuntimeStatusPayload | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.previewRenderable === b.previewRenderable &&
    a.previewHonest === b.previewHonest &&
    a.previewStatus === b.previewStatus &&
    a.jobStatus === b.jobStatus &&
    a.jobId === b.jobId &&
    a.workerConnected === b.workerConnected &&
    a.workerUnavailable === b.workerUnavailable &&
    a.workerUnavailableMessage === b.workerUnavailableMessage &&
    a.blockedReason === b.blockedReason &&
    a.artifactPath === b.artifactPath &&
    a.requiresDeployedWorker === b.requiresDeployedWorker &&
    a.jobCreatedAt === b.jobCreatedAt
  );
}
