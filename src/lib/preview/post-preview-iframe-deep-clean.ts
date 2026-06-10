/** Request deep clean (SW + CacheStorage + preview storage) inside preview iframe. */
export function postPreviewIframeDeepClean(
  iframe: HTMLIFrameElement | null | undefined,
  opts?: { reload?: boolean },
): boolean {
  if (!iframe?.contentWindow) return false;
  try {
    iframe.contentWindow.postMessage(
      { type: "vodex-preview-deep-clean", reload: opts?.reload ?? false },
      "*",
    );
    return true;
  } catch {
    return false;
  }
}
