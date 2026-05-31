/** Iframe src for project preview — HTML is served by the API, never inlined in React state. */
export function projectPreviewFrameUrl(projectId: string, cacheBust?: number | string): string {
  const base = `/api/projects/${encodeURIComponent(projectId)}/preview-html?format=frame`;
  if (cacheBust == null || cacheBust === "") return base;
  return `${base}&v=${encodeURIComponent(String(cacheBust))}`;
}

export type ProjectPreviewStatus = {
  ready: boolean;
  previewRenderable: boolean;
  fileCount: number;
  archetypeId?: string | null;
  previewHtmlLength: number;
  blockedReason?: string | null;
};
