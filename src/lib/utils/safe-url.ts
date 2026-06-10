/** Parse host from absolute or relative URLs without throwing. */
export function safeUrlHost(url: string, origin = "https://localhost"): string {
  try {
    return new URL(url, origin).host;
  } catch {
    if (url.includes("/api/projects/") && url.includes("/preview")) return "Vodex preview";
    const parts = url.replace(/^\/+/, "").split("/");
    return parts[0] || "Preview";
  }
}

export function buildPreviewRepairBuilderUrl(projectId: string): string {
  const prompt =
    "Fix the preview for this imported app. The iframe shows a 404 on the preview-html proxy path. Inspect routing, entry files, and base paths — update only what is needed so all routes load correctly inside the Vodex preview.";
  const params = new URLSearchParams({
    mode: "edit",
    insertPrompt: prompt,
  });
  return `/apps/${projectId}/builder?${params.toString()}`;
}
