import "server-only";

export type HealthLabel = "Excellent" | "Good" | "Needs Attention" | "Critical";

export type AppHealthInput = {
  lifecycleStatus: string;
  buildStatus?: string | null;
  fileCount: number;
  published: boolean;
  integrationsConnected: boolean;
  paymentsConnected: boolean;
  mobileReadiness: number;
  securityOk: boolean;
  hasCriticalSecurityFindings?: boolean;
  filesReadyPreviewFailed?: boolean;
};

export function healthLabelFromScore(score: number): HealthLabel {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 45) return "Needs Attention";
  return "Critical";
}

/** Server-side health score aligned with certification honesty rules. */
export function computeAppHealthScore(input: AppHealthInput): {
  healthScore: number;
  healthLabel: HealthLabel;
  previewOk: boolean;
  publishOk: boolean;
} {
  const previewFailed =
    input.lifecycleStatus === "preview_failed" ||
    input.buildStatus === "preview_failed" ||
    input.filesReadyPreviewFailed === true;

  const hasFiles = input.fileCount > 0;
  const previewOk =
    !previewFailed &&
    (input.lifecycleStatus === "ready" ||
      input.lifecycleStatus === "published" ||
      (hasFiles && (input.buildStatus === "completed" || input.buildStatus === "succeeded")));

  const publishOk =
    input.published ||
    input.lifecycleStatus === "published" ||
    input.lifecycleStatus === "ready";

  let score = 0;

  if (previewOk) score += 22;
  else if (previewFailed) score += 0;
  else if (hasFiles) score += 10;

  if (publishOk) score += 14;

  if (hasFiles && input.buildStatus !== "failed") score += 18;
  else if (hasFiles) score += 8;

  if (input.securityOk && !input.hasCriticalSecurityFindings) score += 14;
  else if (input.securityOk) score += 6;

  score += Math.round(Math.min(100, Math.max(0, input.mobileReadiness)) * 0.12);

  if (input.integrationsConnected) score += 14;
  else if (input.published) score += 0;
  else score += 6;

  if (input.paymentsConnected) score += 12;
  else if (input.published) score += 0;
  else score += 4;

  if (previewFailed) score = Math.min(score, 58);
  if (input.published && !input.integrationsConnected) score = Math.min(score, 72);
  if (input.published && !input.paymentsConnected) score = Math.min(score, 75);

  score = Math.min(100, Math.max(0, Math.round(score)));

  return {
    healthScore: score,
    healthLabel: healthLabelFromScore(score),
    previewOk,
    publishOk,
  };
}
